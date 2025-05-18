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

export const createAta = async (mint: PublicKey, owner: PublicKey) => {
    try {
        const { connection } = getProvider();
        const { keypair: feePayer } = loadFeePayerKeypair();
        
        // Get the ATA address
        const ataAddress = getAssociatedTokenAddressSync(
            mint,
            owner
        );

        try {
            // Check if the account already exists
            const account = await connection.getAccountInfo(ataAddress);
            if (account !== null) {
                if (account.data.length > 0) {
                    return [ataAddress, false];
                }
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

        while (retries > 0 && !signature) {
            try {
                signature = await connection.sendTransaction(tx, [feePayer], {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                });

                // Wait for confirmation with a timeout
                const confirmation = await Promise.race([
                    connection.confirmTransaction({
                        signature,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
                    }, "confirmed"),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Confirmation timeout")), 30000)
                    )
                ]);

                if (confirmation) {
                    // Verify the account was created
                    const newAccount = await connection.getAccountInfo(ataAddress);
                    if (!newAccount) {
                        throw new Error("ATA account not found after creation");
                    }
                    return [ataAddress, true];
                }
            } catch (err) {
                console.warn(`ATA creation attempt failed, retries left: ${retries - 1}`, err);
                retries--;
                if (retries === 0) throw err;
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error("Failed to create ATA after all retries");
    } catch (error) {
        // If the error indicates the account already exists, return the address
        if (error instanceof Error && error.message?.includes("already in use")) {
            const ataAddress = getAssociatedTokenAddressSync(mint, owner);
            const account = await getProvider().connection.getAccountInfo(ataAddress);
            if (account && account.data.length > 0) {
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