import { clusterApiUrl, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getProvider } from "@/utils/dapp-wallets";
import { loadFeePayerKeypair } from "@/utils/dapp-wallets";
import { 
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export const findFactoryPDA = (owner: PublicKey, programId: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("factory"), owner.toBuffer()],
        programId
    );
};

export const findMintAuthPDA = (factoryPda: PublicKey, programId: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("mint_auth"), factoryPda.toBuffer()],
        programId
    );
};

export const findEscrowPDA = (
    sender: PublicKey,
    receiver: PublicKey,
    programId: PublicKey
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), sender.toBuffer(), receiver.toBuffer()],
        programId
    );
};

export const findVaultPDA = (
    escrowPda: PublicKey,
    mint: PublicKey,
    stableStr: string,
    programId: PublicKey
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(`${stableStr}-vault`), escrowPda.toBuffer(), mint.toBuffer()],
        programId
    );
};

// export const findDepositRecordPDA = (
//     escrowPda: PublicKey,
//     depositIdx: number,
//     programId: PublicKey
// ): [PublicKey, number] => {

//     const depositIdxBuf = Buffer.alloc(8);
//     try {
//         depositIdxBuf.writeBigUInt64LE(BigInt(depositIdx), 0);
//     } catch (error) {
//         const view = new DataView(new ArrayBuffer(8));
//         view.setUint32(0, depositIdx, true)
//         view.setUint32(4, 0, true);        

//         Buffer.from(new Uint8Array(view.buffer)).copy(depositIdxBuf);
//     }

//     return PublicKey.findProgramAddressSync(
//         [Buffer.from("deposit"), escrowPda.toBuffer(), depositIdxBuf],
//         programId
//     );
// };

export const findDepositRecordPDA = (
    escrowPda: PublicKey,
    senderPubkey: PublicKey,
    blockhashArray: number[]
): [PublicKey, number] => {
    const { program } = getProvider()
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("deposit"),
            escrowPda.toBuffer(),
            senderPubkey.toBuffer(),
            Buffer.from(blockhashArray)
        ],
        program.programId
    );
};

//Memoised RPC connection
let _sharedConnection: Connection | null = null;
export function getSharedConnection(): Connection {
    if (!_sharedConnection) {
        _sharedConnection = new Connection(
            process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl('devnet')
        );
    }
    return _sharedConnection;
}

export const createAta = async (mint: PublicKey, owner: PublicKey): Promise<[PublicKey, boolean]> => {
    try {
        const { connection } = getProvider();
        const { keypair: feePayer } = loadFeePayerKeypair();
        
        // Get the ATA address
        const ataAddress = getAssociatedTokenAddressSync(mint, owner);

        // First check if the account already exists and is valid
        try {
            const account = await connection.getAccountInfo(ataAddress);
            if (account !== null) {  // Only check if account exists, not its data length
                return [ataAddress, false];
            }
        } catch (error) {
            console.log("Error checking account, proceeding with creation:", error);
        }

        // Create the instruction
        const ix = createAssociatedTokenAccountInstruction(
            feePayer.publicKey,
            ataAddress,
            owner,
            mint
        );

        // Create and send transaction
        const tx = new Transaction().add(ix);
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = feePayer.publicKey;

        let signature: string | null = null;
        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0 && !signature) {
            try {
                signature = await connection.sendTransaction(tx, [feePayer], {
                    skipPreflight: false,
                    preflightCommitment: "finalized",
                });

                console.log("Transaction sent with signature:", signature);

                // Wait for confirmation with a longer timeout for devnet
                const confirmation = await Promise.race([
                    connection.confirmTransaction({
                        signature,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
                    }, "finalized"),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Confirmation timeout")), 90000)
                    )
                ]);

                if (confirmation) {
                    console.log("Transaction confirmed, checking status...");
                    const status = await connection.getSignatureStatus(signature);
                    console.log("Transaction status:", status);

                    // Wait longer for the account to be available
                    console.log("Waiting for account to be available...");
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    
                    let verificationAttempts = 5;
                    let accountVerified = false;
                    
                    while (verificationAttempts > 0 && !accountVerified) {
                        try {
                            console.log(`Verification attempt ${6 - verificationAttempts}/5 for ATA: ${ataAddress.toString()}`);
                            const newAccount = await connection.getAccountInfo(ataAddress, "finalized");
                            console.log("Account info:", {
                                exists: newAccount !== null,
                                dataLength: newAccount?.data.length,
                                owner: newAccount?.owner.toString(),
                                lamports: newAccount?.lamports
                            });
                            
                            if (newAccount) {
                                accountVerified = true;
                                console.log("ATA verified successfully");
                                return [ataAddress, true];
                            }
                        } catch (err) {
                            console.log("Error verifying account:", err);
                        }
                        verificationAttempts--;
                        if (verificationAttempts > 0) {
                            console.log(`Waiting before next verification attempt...`);
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        }
                    }

                    if (!accountVerified) {
                        console.error("Failed to verify ATA after all attempts");
                        throw new Error("ATA account not found or empty after creation");
                    }
                }
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                console.warn(`ATA creation attempt failed, retries left: ${retries - 1}`, lastError);
                retries--;
                if (retries === 0) break;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 2000));
            }
        }

        throw lastError || new Error("Failed to create ATA after all retries");
    } catch (error) {
        if (error instanceof Error && 
            (error.message?.includes("already in use") || 
             error.message?.includes("already exists"))) {
            const ataAddress = getAssociatedTokenAddressSync(mint, owner);
            const account = await getProvider().connection.getAccountInfo(ataAddress);
            if (account) {  // Only check if account exists, not its data length
                return [ataAddress, false];
            }
        }
        console.error("Failed to create ATA:", error);
        throw new Error(`Failed to create ATA: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const getRecentBlockhashArray = async (connection: Connection): Promise<number[]> => {
    const { blockhash } = await connection.getLatestBlockhash();
    const blockhashKey = new PublicKey(blockhash);
    const blockhashBytes = blockhashKey.toBytes();
    return Array.from(blockhashBytes);
};