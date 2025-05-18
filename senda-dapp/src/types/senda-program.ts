import { IdlTypes } from "@coral-xyz/anchor";
import { SendaSmartc } from "@/lib/IDL";
import { PublicKey } from "@solana/web3.js";

type IdlAccounts<T> = IdlTypes<SendaSmartc>["Accounts"][T];

export type InitFactoryAccounts = IdlAccounts<"InitFactory">;
export type InitEscrowAccounts = IdlAccounts<"InitializeEscrow">;
export type DepositAccounts = IdlAccounts<"Deposit">;
export type ReleaseAccounts = IdlAccounts<"Release">;
export type CancelAccounts = IdlAccounts<"Cancel">;

export type Stable = 'usdc' | 'usdt';
export type AuthorizedBy = 'sender' | 'receiver' | 'both';

export enum EscrowState {
    Active,
    Closed
}

export enum SignaturePolicy {
    Dual,
    Single
}

export enum DepositState {
    PendingWithdrawal,
    Completed,
    Cancelled,
    Disputed
}

export interface InitEscrowParams {
    senderPublicKey: string;
    receiverPublicKey: string;
    seed?: number;
}

export interface DepositParams {
    escrowPublicKey: string;
    depositorPublicKey: string;
    counterpartyPublicKey: string;
    stable: Stable;
    authorization: AuthorizedBy;
    amount: number;
}

export interface CancelParams {
    escrowPublicKey: string;
    depositorPublicKey: string;
    counterpartyPublicKey: string;
    depositIdx: number;
}

export interface ReleaseParams {
    escrowPublicKey: string;
    depositIndex: number;
    receivingPartyPublicKey: string;
}

export interface ReleaseResult {
    success: boolean;
    data?: {
        signature: string;
    };
    error?: Error;
}

export interface TransferSplParams {
    userId: string;
    destinationAddress: string;
    stable: Stable;
    amount: number;
}

export interface SignatureUpdateParams {
    depositId: string;
    role: 'sender' | 'receiver';
    signature: string;
}

export type FactoryStats = {
    totalDeposits: number;
    totalDepositsValue: number;
    totalDepositsCount: number;
    totalDepositsValueUSDC: number;
    totalDepositsValueUSDT: number;
    totalDepositsCountUSDC: number;
    totalDepositsCountUSDT: number;
    escrows: Array<{ Escrow: PublicKey | string, state: EscrowState, stats: EscrowStats }>;
}

export type EscrowStats = {
    originalDepositor: PublicKey | string;
    receiver: PublicKey | string;
    pendingWithdrawals: number;
    completedDeposits: number;
    cancelledDeposits: number;
    disputedDeposits: number;
    totalValue: number;
    totalValueUSDC: number;
    totalValueUSDT: number;
    state: EscrowState;
    deposits: Array<DepositRecord>;
}

export type DepositRecord = {
    escrow: PublicKey;
    blockhash: number;
    amount: number;
    policy: SignaturePolicy;
    stable: Stable;
    state: DepositState;
}