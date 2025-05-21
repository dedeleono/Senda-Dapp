import { TransactionStatus, SignatureType } from '@prisma/client'
import { Signature } from '@/types/transaction'

export const hasRoleSigned = (signatures: Signature[], role: SignatureType): boolean => {
  return signatures.some(sig => sig.role === role && sig.status === 'signed')
}

export const parseTransactionSignatures = (signatures: any[]): Signature[] => {
  return signatures.map(sig => {
    try {
      const parsedSig = typeof sig === 'string' ? JSON.parse(sig) : sig
      return {
        signer: parsedSig.signer || 'Unknown',
        role: parsedSig.role?.toUpperCase() as SignatureType,
        timestamp: parsedSig.timestamp ? new Date(parsedSig.timestamp) : undefined,
        status: parsedSig.status || 'pending'
      }
    } catch {
      return {
        signer: 'Unknown',
        role: 'SENDER' as SignatureType,
        status: 'pending'
      }
    }
  })
}

export const getTransactionAge = (createdAt: string | Date): number => {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000)
}

export const formatTransactionDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const canPerformAction = (
  status: TransactionStatus,
  authorization: SignatureType,
  isDepositor: boolean,
  signatures: Signature[],
  depositState?: string
): boolean => {
  // Don't allow actions for completed or cancelled transactions
  if (status !== 'PENDING' || depositState !== 'PENDING') {
    return false
  }
  
  // For sender-only deposits
  if (authorization === 'SENDER') {
    return isDepositor && !signatures.some(sig => 
      sig.role === 'SENDER' && sig.status === 'signed'
    )
  }
  
  // For receiver-only deposits
  if (authorization === 'RECEIVER') {
    return !isDepositor && !signatures.some(sig => 
      sig.role === 'RECEIVER' && sig.status === 'signed'
    )
  }
  
  // For dual signature deposits
  if (authorization === 'DUAL') {
    const userRole = isDepositor ? 'SENDER' : 'RECEIVER'
    const hasUserSigned = signatures.some(
      sig => sig.role === userRole && sig.status === 'signed'
    )
    
    return !hasUserSigned
  }
  
  return false
}

export const getActionButtonText = (
  status: TransactionStatus,
  authorization: SignatureType,
  isDepositor: boolean,
  signatures: Signature[]
): string => {
  // For dual signature deposits
  if (authorization === 'DUAL') {
    const userRole = isDepositor ? 'SENDER' : 'RECEIVER'
    const hasUserSigned = signatures.some(
      sig => sig.role === userRole && sig.status === 'signed'
    )
    
    if (!hasUserSigned) {
      return isDepositor ? 'Sign as Sender' : 'Sign as Receiver'
    }
    
    return 'Signed'
  }
  
  // For single signature deposits
  if (isDepositor && authorization === 'SENDER') {
    return 'Sign as Sender'
  }
  
  if (!isDepositor && authorization === 'RECEIVER') {
    return 'Sign as Receiver'
  }
  
  return 'Close'
} 