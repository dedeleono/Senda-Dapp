import { TransactionStatus, SignatureType } from '@prisma/client'

export type TokenType = 'USDC' | 'USDT';
export type AuthorizationType = 'SENDER' | 'RECEIVER' | 'DUAL';
export type AuthorizedBy = 'sender' | 'receiver' | 'both';

export interface RecipientInfo {
  email: string;
  walletAddress?: string;
  exists: boolean;
}

export interface AmountInfo {
  value: number;
  token: TokenType;
}

export interface TransactionResult {
  success: boolean;
  depositId?: string;
  signature?: string;
  error?: string;
}

export interface ServerStartResult {
  recipientNotFound: boolean;
  escrowExists: boolean;
  escrowPublicKey: string;
  senderPublicKey: string;
  receiverPublicKey: string;
}

export interface ServerFinalResult extends ServerStartResult {
  transactionId: string;
  depositId: string;
}

export interface DepositFormData {
  recipient: {
    email: string;
    exists: boolean;
  };
  amount: {
    value: number;
    token: TokenType;
  };
  authorization: AuthorizationType;
}

export interface DepositInput {
  escrow: string;
  depositor: string;
  recipientEmail: string;
  stable: 'usdc' | 'usdt';
  authorization: AuthorizationType;
  amount: number;
}

export interface EscrowInput {
  senderPublicKey: string;
  receiverPublicKey: string;
  seed: number;
}

export interface EscrowResult {
  success: boolean;
  escrowPublicKey?: string;
  error?: string;
}

export interface UserResult {
  id: string;
  email: string;
  sendaWalletPublicKey: string;
  role: 'GUEST' | 'INDIVIDUAL' | 'BUSINESS';
}

// New Service Response Types
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export type UserServiceResponse = ServiceResponse<{
  id: string;
  email: string;
  publicKey: string;
  role: 'GUEST' | 'INDIVIDUAL' | 'BUSINESS';
}>;

export type EscrowServiceResponse = ServiceResponse<{
  escrowAddress: string;
  senderPublicKey: string;
  receiverPublicKey: string;
}>;

export type CreateDepositResponse = ServiceResponse<{
  signature: string;
  escrowAddress: string;
  depositId: string;
  user: {
    id: string;
    publicKey: string;
    role: 'GUEST' | 'INDIVIDUAL' | 'BUSINESS';
  };
  transaction: {
    id: string;
    status: TransactionStatus;
  };
}>;

// UI Form Types
export interface DepositFormState {
  formData: DepositFormData;
  step: number;
  isSubmitting: boolean;
  error?: string;
}

export interface DepositFormActions {
  updateFormData: (data: Partial<DepositFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  resetForm: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error?: string) => void;
}

export interface Signature {
  signer: string
  role: SignatureType
  timestamp?: Date
  status: 'signed' | 'pending'
}

export interface TransactionDetailsData {
  id: string
  amount: number
  token: 'USDC' | 'USDT'
  recipientEmail: string
  senderEmail: string
  createdAt: Date
  status: TransactionStatus
  authorization: SignatureType
  isDepositor: boolean
  signatures: Signature[]
  statusHistory: Array<{
    status: string
    timestamp: Date
    actor?: string
  }>
  depositIndex: number
  transactionSignature?: string
  senderPublicKey: string
  receiverPublicKey: string
  depositRecord?: {
    state: string
  }
}

export interface PolicyDetails {
  icon: any
  label: string
  description: string
  className: string
}

export const getPolicyDetails = (policy: string, history: boolean = false): PolicyDetails => {
  switch (policy.toUpperCase()) {
    case 'SENDER':
      return {
        icon: 'UserIcon',
        label: 'Single Signature',
        description: !history ? 'Requires sender signature' : 'Signed by sender',
        className: 'text-[#596f62] dark:text-[#d7dfbe] bg-[#596f62]/20 dark:bg-[#1c3144]/20',
      }
    case 'RECEIVER':
      return {
        icon: 'UserIcon',
        label: 'Single Signature',
        description: !history ? 'Requires receiver signature' : 'Signed by receiver',
        className: 'text-[#596f62] dark:text-[#d7dfbe] bg-[#596f62]/20 dark:bg-[#1c3144]/20',
      }
    case 'DUAL':
      return {
        icon: 'UsersIcon',
        label: 'Multi-Signature',
        description: !history ? 'Requires multiple signatures' : 'Signed by both',
        className: 'text-[#7ea16b] dark:text-[#7ea16b] bg-[#7ea16b]/20 dark:bg-[#7ea16b]/10',
      }
    default:
      return {
        icon: 'ShieldCheckIcon',
        label: policy,
        description: 'Custom policy',
        className: 'text-[#1c3144] dark:text-[#f6ead7] bg-[#f6ead7]/30 dark:bg-[#f6ead7]/10',
      }
  }
}

export const getAuthorizationText = (authorization: SignatureType): string => {
  switch (authorization) {
    case 'SENDER':
      return 'Sender only'
    case 'RECEIVER':
      return 'Receiver only'
    case 'DUAL':
      return 'Both parties must approve'
    default:
      return authorization
  }
}

export const hasRoleSigned = (signatures: Signature[], role: SignatureType): boolean => {
  return signatures.some(sig => sig.role === role && sig.status === 'signed')
}

export const getStatusBadgeStyles = (status: TransactionStatus): string => {
  switch (status) {
    case 'COMPLETED':
      return 'text-success-foreground bg-success/10 border border-success/20'
    case 'CANCELLED':
      return 'text-destructive-foreground bg-destructive/10 border border-destructive/20'
    case 'PENDING':
      return 'text-warning-foreground bg-warning/10 border border-warning/20'
    default:
      return 'text-muted-foreground bg-muted/20 border border-muted/30'
  }
} 