import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { generateNonce } from "@/utils/wallet-nonce";
import {
    signAndSendTransaction,
    TransactionRequest
} from "@/lib/utils/solana-transaction";
import { TransactionInstruction, PublicKey, Keypair } from "@solana/web3.js";
import { encryptPrivateKey } from "@/lib/utils/crypto";

const parseInstruction = (rawInstruction: any): TransactionInstruction => {
    return new TransactionInstruction({
        keys: rawInstruction.keys.map((key: any) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable
        })),
        programId: new PublicKey(rawInstruction.programId),
        data: Buffer.from(rawInstruction.data, 'base64')
    });
};

export const walletRouter = router({

    createWallet: protectedProcedure
        .mutation(async () => {
            try {
                // Generate new wallet
                const keypair = Keypair.generate();
                const secretBuffer = Buffer.from(keypair.secretKey);
                
                // Encrypt private key
                const { iv, authTag, data: encryptedPrivateKey } = encryptPrivateKey(secretBuffer);
                
                return {
                    success: true,
                    data: {
                        publicKey: keypair.publicKey.toString(),
                        encryptedPrivateKey,
                        iv,
                        authTag
                    }
                };
                
            } catch (error) {
                console.error('Error creating wallet:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create wallet'
                });
            }
        }),

    generateNonce: protectedProcedure
        .input(z.object({ publicKey: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                console.log("Generate Nonce - Complete Session:", ctx.session);
                console.log("Generate Nonce - User Object:", ctx.session?.user);

                if (!ctx.session || !ctx.session.user) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Authentication required",
                    });
                }

                const userId = ctx.session.user.id;
                const userEmail = ctx.session.user.email;

                console.log("Using identifier for nonce generation:", { userId, userEmail });

                let effectiveUserId = userId;

                if (!effectiveUserId && userEmail) {
                    console.log("Looking up user by email:", userEmail);
                    const user = await prisma.user.findUnique({
                        where: { email: userEmail }
                    });

                    if (user) {
                        effectiveUserId = user.id;
                        console.log("Found user by email:", effectiveUserId);
                    }
                }

                const nonce = await generateNonce(input.publicKey);
                return { nonce };
            } catch (error) {
                console.error("Failed to generate nonce:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to generate nonce",
                });
            }
        }),
    sendTransaction: protectedProcedure
        .input(z.object({
            instructions: z.array(z.object({
                keys: z.array(z.object({
                    pubkey: z.string(),
                    isSigner: z.boolean(),
                    isWritable: z.boolean()
                })),
                programId: z.string(),
                data: z.string()
            })),
            legacyTransaction: z.boolean().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session?.user?.id) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated"
                });
            }

            try {
                const instructions = input.instructions.map(parseInstruction);

                const transactionRequest: TransactionRequest = {
                    userId: ctx.session.user.id,
                    instructions,
                    legacyTransaction: input.legacyTransaction
                };

                const result = await signAndSendTransaction(transactionRequest);

                if (result.message === 'error') {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: result.message || "Transaction failed"
                    });
                }

                return {
                    signature: result.signature,
                    success: true
                };
            } catch (error) {
                console.error("Send transaction error:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Unknown error sending transaction"
                });
            }
        }),

    findUserByWallet: protectedProcedure
        .input(z.object({ walletPublicKey: z.string() }))
        .query(async ({ input }) => {
            const mainWalletUser = await prisma.user.findUnique({
                where: { sendaWalletPublicKey: input.walletPublicKey },
                select: { id: true, email: true, iv: true, authTag: true, encryptedPrivateKey: true },
            });

            if (mainWalletUser) {
                return mainWalletUser.id;
            }
        }),

    verifyEscrowAccess: protectedProcedure
        .input(z.object({
            connectedWalletPublicKey: z.string(),
            escrowParticipantPublicKey: z.string()
        }))
        .query(async ({ input }) => {
            if (input.connectedWalletPublicKey === input.escrowParticipantPublicKey) {
                return true;
            }

            const user = await prisma.user.findUnique({
                where: { sendaWalletPublicKey: input.escrowParticipantPublicKey },
                select: { id: true },
            });

            if (!user) {
                return false;
            }
        }),
        
});

export default walletRouter;