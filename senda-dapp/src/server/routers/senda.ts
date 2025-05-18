import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
    PublicKey,
    Keypair,
    Transaction
} from "@solana/web3.js";
import {
    AnchorProvider,
    BN,
    web3
} from "@coral-xyz/anchor";

import {
    findDepositRecordPDA,
    createAta,
    findEscrowPDA,
    getRecentBlockhashArray
} from "@/lib/senda/helpers";
import { USDC_MINT, USDT_MINT } from "@/lib/constants";
import {
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { TRPCError } from "@trpc/server";
import { getProvider, loadUserSignerKeypair } from "@/utils/dapp-wallets";
import { prisma } from "@/lib/db";
import crypto from 'crypto';
import { UserService } from "../services/user";
import { EscrowService } from "../services/escrow";
import { handleRouterError } from "../utils/error-handler";
import { CreateDepositResponse } from "@/types/transaction";
import { CancelAccounts, DepositAccounts, InitEscrowAccounts, ReleaseAccounts } from "@/types/senda-program";
import { sendGuestDepositNotificationEmail } from "@/lib/validations/guest-deposit-notification";
import { sendDepositNotificationEmail } from "@/lib/validations/deposit-notification";
import { SignatureType } from "@/components/transactions/transaction-card";
import { createTransferCheckedInstruction } from "@solana/spl-token";


export const sendaRouter = router({

    getFactoryStats: publicProcedure
        .input(z.object({ owner: z.string().optional() }))
        .query(async ({ input }) => {
            const { connection, program } = getProvider();
            const ownerPub = input.owner
                ? new PublicKey(input.owner)
                : program.provider.publicKey;

            if (!ownerPub) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Owner public key is required"
                });
            }

            const [factoryPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("factory"), ownerPub.toBuffer()],
                program.programId
            );

            const acct = await connection.getAccountInfo(factoryPda);
            if (!acct) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Factory not initialised"
                });
            }

            return { address: factoryPda.toBase58(), raw: acct.data.toString("base64") };
        }),

    initEscrow: protectedProcedure
        .input(
            z.object({
                sender: z.string(),
                receiver: z.string(),
                seed: z.number().optional().default(0)
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const { program, feePayer, connection } = getProvider();

                const senderPk = new PublicKey(input.sender);
                const receiverPk = new PublicKey(input.receiver);

                const usdcMint = new PublicKey(USDC_MINT);
                const usdtMint = new PublicKey(USDT_MINT);

                // sender ATAs
                await createAta(usdcMint, senderPk);
                await createAta(usdtMint, senderPk);

                // receiver ATAs
                await createAta(usdcMint, receiverPk);
                await createAta(usdtMint, receiverPk);

                const [escrowPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("escrow"), senderPk.toBuffer(), receiverPk.toBuffer()],
                    program.programId
                );

                // Check if escrow already exists
                const escrowAccount = await connection.getAccountInfo(escrowPda);
                if (escrowAccount !== null) {
                    return { signature: "", escrow: escrowPda.toBase58() };
                }

                const tx = await program.methods
                    .initializeEscrow(new BN(input.seed))
                    .accounts({
                        feePayer: feePayer.publicKey,
                        sender: senderPk,
                        receiver: receiverPk,
                        usdcMint,
                        usdtMint,
                    } as InitEscrowAccounts)
                    .transaction();

                const { keypair: senderKp } = await loadUserSignerKeypair(
                    ctx.session!.user.id
                );

                const sig = await (program.provider as AnchorProvider).sendAndConfirm(tx, [senderKp, feePayer]);

                return { signature: sig, escrow: escrowPda.toBase58() };
            } catch (error) {
                console.error('Error in initEscrow:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to initialize escrow',
                    cause: error
                });
            }
        }),

    createDeposit: protectedProcedure
        .input(
            z.object({
                userId: z.string(),
                depositor: z.string(),
                recipientEmail: z.string().email(),
                stable: z.enum(["usdc", "usdt"]),
                authorization: z.enum(["SENDER", "RECEIVER", "DUAL"]),
                amount: z.number().positive()
            })
        )
        .mutation(async ({ ctx, input }): Promise<CreateDepositResponse> => {
            console.log('Starting createDeposit with input:', {
                ...input,
                userId: '[REDACTED]' 
            });

            const {connection} = getProvider()
            const blockhashArray = await getRecentBlockhashArray(connection)

            const usdcMint = new PublicKey(USDC_MINT);
            const usdtMint = new PublicKey(USDT_MINT);

            try {
                console.log('Getting or creating user...');
                const userResult = await UserService.getOrCreateUser(input.recipientEmail);
                if (!userResult.success || !userResult.data) {
                    console.error('Failed to get/create user:', userResult.error);
                    throw new Error(userResult.error?.message || 'Failed to get or create user');
                }
                const receiver = userResult.data;
                console.log('User retrieved/created successfully:', {
                    role: receiver.role,
                    isNewUser: !receiver.id
                });

                console.log('Initializing escrow...');
                const escrowResult = await EscrowService.initializeEscrow(
                    input.userId,
                    input.depositor,
                    receiver.publicKey,
                    0
                );
                if (!escrowResult.success || !escrowResult.data) {
                    console.error('Failed to initialize escrow:', escrowResult.error);
                    throw new Error(escrowResult.error?.message || 'Failed to initialize escrow');
                }
                const escrowData = escrowResult.data;
                console.log('Escrow initialized:', { escrowAddress: escrowData.escrowAddress });

                const { program, feePayer } = getProvider(); //@todo we would also send the authority keypair from the provider
                const depositorPk = new PublicKey(input.depositor);
                const counterpartyPk = new PublicKey(receiver.publicKey);

                console.log('Setting up deposit transaction...');
                const [escrowPda] = findEscrowPDA(
                    depositorPk,
                    counterpartyPk,
                    program.programId
                );

                // Get next deposit index
                let nextDepositIdx = 0;
                try {
                    console.log('Fetching escrow account...');
                    const escrowAccount = await program.account.escrow.fetch(escrowPda);
                    nextDepositIdx = escrowAccount.depositCount.toNumber();
                    console.log('Next deposit index:', nextDepositIdx);
                } catch (error) {
                    console.log('No existing escrow account found, using index 0', error);
                    nextDepositIdx = 0;
                }

                const [depositRecordPda] = findDepositRecordPDA(escrowPda, depositorPk, blockhashArray);

                const stableEnum = input.stable === "usdc" ? { usdc: {} } : { usdt: {} };
                const authEnum =
                    input.authorization === "SENDER"
                        ? { sender: {} }
                        : input.authorization === "RECEIVER"
                            ? { receiver: {} }
                            : { both: {} };

                const lamports = Math.round(input.amount * 1_000_000);

                console.log('Building deposit transaction...');

                const ix = await program.methods
                    .deposit(stableEnum, authEnum, blockhashArray, new BN(lamports))
                    .accounts({
                        escrow: escrowPda,
                        sender: depositorPk,
                        receiver: counterpartyPk,
                        authority: feePayer.publicKey,
                        usdcMint,
                        usdtMint,
                        depositRecord: depositRecordPda,
                        feePayer: feePayer.publicKey,
                    } as DepositAccounts)
                    .instruction();

                console.log('Loading depositor keypair...');
                const { keypair: depositor } = await loadUserSignerKeypair(
                    ctx.session!.user.id
                );

                const depositTx = new Transaction().add(ix);
                const depositSig = await web3.sendAndConfirmTransaction(connection, depositTx, [depositor, feePayer]);
                console.log('Deposit transaction confirmed:', depositSig);

                // Create DB records
                console.log('Creating database records...');

                const existingEscrow = await prisma.escrow.findUnique({
                    where: {
                        id: escrowData.escrowAddress
                    }
                });

                const { transaction, deposit } = await prisma.$transaction(async (tx) => {
                    const txn = await tx.transaction.create({
                        data: {
                            userId: ctx.session.user.id,
                            walletPublicKey: input.depositor,
                            destinationAddress: receiver.publicKey,
                            amount: input.amount,
                            status: 'PENDING',
                            type: 'TRANSFER',
                            destinationUserId: receiver.id
                        },
                        select: {
                            id: true,
                            status: true
                        }
                    });

                    if (existingEscrow) {
                        await tx.escrow.update({
                            where: { id: existingEscrow.id },
                            data: {
                                depositCount: existingEscrow.depositCount + 1
                            }
                        });
                    } else {
                        await tx.escrow.create({
                            data: {
                                id: escrowData.escrowAddress,
                                senderPublicKey: input.depositor,
                                receiverPublicKey: receiver.publicKey,
                                depositCount: 0,
                                state: 'Active'
                            }
                        });
                    }

                    const dep = await tx.depositRecord.create({
                        data: {
                            depositIndex: nextDepositIdx,
                            amount: input.amount,
                            policy: input.authorization as SignatureType,
                            stable: input.stable,
                            state: 'PENDING',
                            userId: ctx.session.user.id,
                            escrowId: escrowData.escrowAddress,
                            transactionId: txn.id,
                            blockhash: blockhashArray
                        },
                    });

                    if (!existingEscrow) {
                        await tx.escrow.update({
                            where: { id: escrowData.escrowAddress },
                            data: {
                                depositCount: 1
                            }
                        });
                    }

                    return { transaction: txn, deposit: dep };
                });
                console.log('Database records created successfully');

                // Send notification email
                try {
                    console.log('Sending notification email...');
                    if (receiver.role === 'GUEST') {
                        const inviteToken = crypto.randomBytes(32).toString('hex');
                        await prisma.verificationToken.create({
                            data: {
                                identifier: input.recipientEmail,
                                token: inviteToken,
                                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                            },
                        });

                        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitation?token=${inviteToken}`;
                        await prisma.verificationToken.update({
                            where: { token: inviteToken },
                            data: {
                                // Add any additional metadata you need for the invitation
                                metadata: JSON.stringify({
                                    escrowId: escrowData.escrowAddress,
                                    amount: input.amount,
                                    token: input.stable.toUpperCase(),
                                })
                            }
                        });
                        await sendGuestDepositNotificationEmail(
                            input.recipientEmail,
                            inviteUrl,
                            ctx.session.user.email!,
                            input.amount.toFixed(2),
                            input.stable.toUpperCase(),
                            ctx.session.user.name || undefined
                        );
                    } else {
                        await sendDepositNotificationEmail(
                            input.recipientEmail,
                            input.amount,
                            input.stable.toUpperCase(),
                            ctx.session.user.name || undefined
                        );
                    }
                    console.log('Notification email sent successfully');
                } catch (error) {
                    console.error('Error sending email notification:', error);
                }

                console.log('Deposit process completed successfully');
                return {
                    success: true,
                    data: {
                        signature: depositSig,
                        escrowAddress: escrowData.escrowAddress,
                        depositId: deposit.id,
                        user: {
                            id: receiver.id,
                            publicKey: receiver.publicKey,
                            role: receiver.role
                        },
                        transaction: {
                            id: transaction.id,
                            status: transaction.status
                        }
                    }
                };

            } catch (error) {
                console.error('Error in createDeposit:', error);
                return {
                    success: false,
                    error: handleRouterError(error)
                };
            }
        }),

    cancelDeposit: protectedProcedure
        .input(
            z.object({
                escrow: z.string(),
                originalDepositor: z.string(),
                counterparty: z.string(),
                depositId: z.string()
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { program, feePayer, connection } = getProvider();

            const escrowPk = new PublicKey(input.escrow);
            const depositorPk = new PublicKey(input.originalDepositor);
            const counterpartyPk = new PublicKey(input.counterparty);

            const { keypair: depositorKp } = await loadUserSignerKeypair(
                ctx.session!.user.id
            );

            const deposit = await prisma.depositRecord.findUnique({
                where: { id: input.depositId },
                include: {
                    transaction: true,
                    escrow: true
                }
            });

            if (!deposit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Deposit record not found'
                });
            }

            const usdcMint = new PublicKey(USDC_MINT);
            const usdtMint = new PublicKey(USDT_MINT);

            const [depositRecord] = findDepositRecordPDA(escrowPk, depositorPk, deposit.blockhash);

            const cancelIx = await program.methods
                .cancel(deposit.blockhash)
                .accounts({
                    escrow: escrowPk,
                    sender: depositorPk,
                    receiver: counterpartyPk,
                    authority: feePayer.publicKey,
                    usdcMint,
                    usdtMint,
                    depositRecord,
                } as CancelAccounts)
                .instruction();

            const cancelTx = new Transaction().add(cancelIx);
            const cancelSig = await web3.sendAndConfirmTransaction(connection, cancelTx, [depositorKp, feePayer]);

            return { signature: cancelSig };
        }),

    updateDepositSignature: protectedProcedure
        .input(
            z.object({
                depositId: z.string(),
                role: z.enum(['sender', 'receiver']),
                signerId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            
            try {
                console.log("Update Signature Input:", input);
                console.log("Session User:", ctx.session?.user);

                // Get the current deposit record from db
                const deposit = await prisma.depositRecord.findUnique({
                    where: { id: input.depositId },
                    include: { 
                        transaction: {
                            select: {
                                id: true,
                                userId: true,
                                destinationUserId: true,
                                destinationAddress: true
                            }
                        }, 
                        escrow: true,
                        user: {
                            select: {
                                id: true,
                                sendaWalletPublicKey: true
                            }
                        },
                    }
                });

                console.log("Found Deposit:", {
                    id: deposit?.id,
                    userId: deposit?.userId,
                    policy: deposit?.policy,
                    user: deposit?.user,
                    transaction: {
                        id: deposit?.transaction?.id,
                        userId: deposit?.transaction?.userId
                    },
                    blockhash: deposit?.blockhash
                });

                if (!deposit) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Deposit record not found'
                    });
                }

                const { program, feePayer, connection } = getProvider();

                const escrowPk = new PublicKey(deposit.escrow?.id as string);
                console.log("Escrow", escrowPk);
                const receivingPartyPk = new PublicKey(deposit.escrow?.receiverPublicKey as string);
                console.log("Receiving party", receivingPartyPk);
                // Fetch the escrow account to get sender and receiver info
                const escrowAccount = await program.account.escrow.fetch(escrowPk);
                console.log("Escrow account", escrowAccount);
                const senderPk = new PublicKey(escrowAccount.sender);
                console.log("Depositor", senderPk);
                const receiverPk = new PublicKey(escrowAccount.receiver);
                console.log("Counterparty", receiverPk);

                const [escrowPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("escrow"), senderPk.toBuffer(), receiverPk.toBuffer()],
                    program.programId
                );

                const [depositRecordPda] = findDepositRecordPDA(escrowPda, senderPk, deposit.blockhash);
                console.log("Deposit record PDA found!", depositRecordPda);

                try {
                    const depositRecordAccount = await program.account.depositRecord.fetch(depositRecordPda);
                    console.log("Deposit Record Account Data:", {
                        amount: depositRecordAccount.amount.toString(),
                        stable: depositRecordAccount.stable,
                        state: depositRecordAccount.state,
                        policy: depositRecordAccount.policy,
                        bump: depositRecordAccount.bump,
                        escrow: depositRecordAccount.escrow.toBase58(),
                        index: depositRecordAccount.depositIdx.toString(),
                    });

                    // Check if the deposit is already completed on-chain
                    if ('complete' in depositRecordAccount.state) {
                        // Update database state to match blockchain
                        await prisma.depositRecord.update({
                            where: { id: input.depositId },
                            data: {
                                state: 'COMPLETED',
                                senderApproved: true,
                                receiverApproved: true
                            }
                        });

                        return {
                            success: true,
                            data: {
                                message: 'Deposit is already completed on-chain. Database updated.',
                                state: 'COMPLETED'
                            }
                        };
                    }

                } catch (error) {
                    console.error("Error fetching deposit record:", error);
                }

                const isOriginalSender = deposit.user?.sendaWalletPublicKey === input.signerId;
                console.log("Authorization Check (Detailed):", {
                    depositUserId: deposit.userId,
                    inputSignerId: input.signerId,
                    isOriginalSender,
                    policy: deposit.policy,
                    role: input.role,
                    transactionUserId: deposit.transaction?.userId,
                    sessionUserId: ctx.session?.user?.id,
                    userWalletPublicKey: deposit.user?.sendaWalletPublicKey
                });

                if (deposit.policy === "SENDER" && input.role === "sender" && !isOriginalSender) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'Only the original sender can sign this deposit'
                    });
                }

                let isExecutable = false;

                if (deposit.policy === "RECEIVER" && input.role === "receiver") {
                    await prisma.depositRecord.update({
                        where: { id: input.depositId },
                        data: {
                            receiverApproved: true,
                        }
                    });
                    isExecutable = true;
                } else if (deposit.policy === "SENDER" && input.role === "sender") {
                    await prisma.depositRecord.update({
                        where: { id: input.depositId },
                        data: {
                            senderApproved: true,
                        }
                    });
                    isExecutable = true;
                } else if (deposit.policy === "DUAL") {
                    if (input.role === "sender") {
                        const updatedDeposit = await prisma.depositRecord.update({
                            where: { id: input.depositId },
                            data: {
                                senderApproved: true,
                            }
                        });

                        if (updatedDeposit.senderApproved && updatedDeposit.receiverApproved) {
                            isExecutable = true;
                        }
                    } else {
                        const updatedDeposit = await prisma.depositRecord.update({
                            where: { id: input.depositId },
                            data: {
                                receiverApproved: true,
                            }
                        });

                        if (updatedDeposit.senderApproved && updatedDeposit.receiverApproved) {
                            isExecutable = true;
                        }
                    }
                }
                
                if (!isExecutable) {
                    return {
                        success: false,
                        data: {
                            executed: false,
                            message: deposit.policy === "DUAL" 
                                ? `Waiting for ${!deposit.senderApproved ? 'sender' : 'receiver'} approval`
                                : `Waiting for ${deposit.policy.toLowerCase()} approval`
                        }
                    };
                }

                // Determine who is the authorized signer based on the deposit record

                const signers: Keypair[] = [];
                if (deposit.policy === "SENDER" || deposit.policy === "DUAL") {
                    console.log("Loading depositor keypair");
                    const { keypair: depositor } = await loadUserSignerKeypair(
                        deposit.user.id
                    );                    
                    signers.push(depositor);
                } if (deposit.policy === "RECEIVER" || deposit.policy === "DUAL") {
                    if (!deposit.transaction?.destinationUserId) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Destination user not found'
                        });
                    }
                    const { keypair: receiver } = await loadUserSignerKeypair(
                        deposit.transaction.destinationUserId
                    );
                    signers.push(receiver);
                }

                console.log("Signers", signers.forEach(signer =>
                    console.log("Signer:", signer.publicKey.toBase58())
                ));

                // Create and send the release transaction
                const usdcMint = new PublicKey(USDC_MINT);
                const usdtMint = new PublicKey(USDT_MINT);

                const releaseIx = await program.methods
                    .release(deposit.blockhash)
                    .accounts({
                        escrow: escrowPk,
                        sender: senderPk,
                        receiver: receiverPk,
                        receivingParty: input.role === 'receiver' ? receiverPk : senderPk,
                        authority: feePayer.publicKey,
                        usdcMint,
                        usdtMint,
                        depositRecord: depositRecordPda,
                        feePayer: feePayer.publicKey
                    } as ReleaseAccounts)
                    .instruction();

                const releaseTx = new Transaction().add(releaseIx);

                // Signature(s)
                const releaseSig = await web3.sendAndConfirmTransaction(
                    connection,
                    releaseTx,
                    [...signers, feePayer]
                );

                console.log("Signature", releaseSig);

                const updatedDeposit = await prisma.depositRecord.update({
                    where: { id: input.depositId },
                    data: {
                        state: 'COMPLETED',
                        signature: releaseSig
                    }
                });

                return { success: true, data: updatedDeposit };
            } catch (error) {
                console.error('Error updating deposit signature:', error);
                return {
                    success: false,
                    error: handleRouterError(error)
                };
            }
        }),

    transferSpl: protectedProcedure
        .input(
            z.object({
                userId: z.string(),
                destinationAddress: z.string(),
                stable: z.enum(["usdc", "usdt"]),
                amount: z.number().positive()
            })
        )
        .mutation(async ({ ctx, input }) => {
            console.log('Starting transferSpl with input:', {
                ...input,
                userId: '[REDACTED]' // Don't log sensitive data
            });

            try {
                const usdcMint = new PublicKey(USDC_MINT);
                const usdtMint = new PublicKey(USDT_MINT);
                const mintPubkey = input.stable === "usdc" ? usdcMint : usdtMint;

                const user = await prisma.user.findUnique({
                    where: {
                        id: input.userId
                    }
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found'
                    });
                }

                const { connection, feePayer } = getProvider();
                const senderPk = new PublicKey(user.sendaWalletPublicKey);
                const receiverPk = new PublicKey(input.destinationAddress);

                // Create transaction to transfer tokens
                console.log('Setting up transfer transaction...');

                // Ensure ATAs exist
                await createAta(mintPubkey, senderPk);
                await createAta(mintPubkey, receiverPk);

                const senderAta = getAssociatedTokenAddressSync(mintPubkey, senderPk);
                const receiverAta = getAssociatedTokenAddressSync(mintPubkey, receiverPk);

                // Convert amount to lamports (USDC/USDT use 6 decimals)
                const lamports = Math.round(input.amount * 1_000_000);

                // Create the transfer transaction using SPL token program directly
                const tx = new Transaction().add(
                    createTransferCheckedInstruction(
                        senderAta,
                        mintPubkey,
                        receiverAta,
                        senderPk,
                        lamports,
                        6 // USDC/USDT have 6 decimals
                    )
                );

                tx.feePayer = feePayer.publicKey;
                // Load the sender's keypair
                console.log('Loading sender keypair...');
                const { keypair: senderKeypair } = await loadUserSignerKeypair(
                    ctx.session!.user.id
                );

                // Send the transaction
                console.log('Sending transfer transaction...');
                const signature = await connection.sendTransaction(
                    tx, 
                    [senderKeypair, feePayer],
                    {skipPreflight: false}
                );
                
                await connection.confirmTransaction(signature);
                console.log('Transfer transaction confirmed:', signature);

                // Create DB record of the transaction
                const transaction = await prisma.transaction.create({
                    data: {
                        userId: ctx.session.user.id,
                        walletPublicKey: user.sendaWalletPublicKey,
                        destinationAddress: input.destinationAddress,
                        amount: input.amount,
                        status: 'COMPLETED',
                        type: 'TRANSFER'
                    }
                });

                return { 
                    success: true, 
                    signature,
                    transaction: {
                        id: transaction.id,
                        status: transaction.status
                    }
                };

            } catch (error) {
                console.error('Error in transferSpl:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to transfer tokens',
                    cause: error
                });
            }
        }),
});

export default sendaRouter;