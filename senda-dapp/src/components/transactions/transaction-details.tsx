'use client';

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import Image from 'next/image';
import usdcIcon from '@/public/usdc.svg';
import usdtIcon from '@/public/usdt-round.svg';
import StatusTimeline from './status-timeline';
import { 
  ArrowUpRight, Copy, XCircle, Check, Loader2, ExternalLink, Calendar, Mail 
} from 'lucide-react';
import { format } from 'date-fns';
import { TransactionStatus, SignatureType } from './transaction-card';
import { useToast } from '@/hooks/use-toast';
import { useSendaProgram } from '@/stores/use-senda-program';

interface TransactionDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    amount: number;
    token: 'USDC' | 'USDT';
    recipientEmail: string;
    senderEmail: string;
    createdAt: Date;
    status: TransactionStatus;
    authorization: SignatureType;
    isDepositor: boolean;
    signatures: Array<{
      signer: string;
      role: SignatureType;
      timestamp?: Date;
      status: 'signed' | 'pending';
    }>;
    statusHistory: Array<{
      status: string;
      timestamp: Date;
      actor?: string;
    }>;
    depositIndex: number;
    transactionSignature?: string;
    senderPublicKey: string;
    receiverPublicKey: string;
    depositRecord?: {
      state: string;
    };
  };
}

export default function TransactionDetails({ 
  isOpen, 
  onClose, 
  transaction 
}: TransactionDetailsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { updateDepositSignature } = useSendaProgram();

  const handleActionClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    console.log('Starting transaction action with data:', {
      status: transaction.status,
      authorization: transaction.authorization,
      isDepositor: transaction.isDepositor,
      depositIndex: transaction.depositIndex,
      signatures: transaction.signatures
    });
    
    try {
      const { status, authorization, isDepositor, depositIndex, id } = transaction;
      
      if (!id) {
        throw new Error('Missing transaction ID');
      }
      
      if (status === 'PENDING' && transaction.depositRecord?.state === 'PENDING') {
        const role = isDepositor ? 'sender' : 'receiver';
        const signerId = isDepositor ? transaction.senderPublicKey : transaction.receiverPublicKey;

        const result = await updateDepositSignature({
          depositId: id,
          role,
          signerId
        });

        if (!result.success) {
          throw result.error || new Error('Failed to update signature');
        }

        toast({
          title: 'Signature Added',
          description: authorization === 'DUAL' 
            ? 'Your signature has been recorded. Waiting for counterparty signature.'
            : 'Transaction signed successfully.',
        });
      }
    } catch (error) {
      console.error('Transaction action failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process transaction',
      });
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleReleaseFunds = async (depositIdx: number) => {
    try {
      if (!transaction.id || !transaction.senderPublicKey || !transaction.receiverPublicKey) {
        throw new Error('Missing required transaction information');
      }

      const receivingPartyPublicKey = transaction.isDepositor 
        ? transaction.receiverPublicKey
        : transaction.senderPublicKey;

      // const result = await requestWithdrawal({
      //   escrowPublicKey: transaction.id,
      //   depositIndex: depositIdx,
      //   receivingPartyPublicKey
      // });

      // if (!result.success) {
      //   throw result.error || new Error('Failed to process withdrawal');
      // }

      await updateDepositSignature({
        depositId: transaction.id,
        role: transaction.isDepositor ? 'sender' : 'receiver',
        signerId: transaction.isDepositor ? transaction.senderPublicKey : transaction.receiverPublicKey
      });

      toast({
        title: 'Success',
        description: 'Funds have been released successfully',
      });

      onClose();
    } catch (error) {
      console.error('Error releasing funds:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to release funds',
      });
    }
  };

  const canPerformAction = () => {
    const { status, authorization, isDepositor, signatures } = transaction;
    
    // Don't allow actions for completed or cancelled transactions
    if (status !== 'PENDING' || transaction.depositRecord?.state !== 'PENDING') {
      return false;
    }
    
    // For sender-only deposits
    if (authorization === 'SENDER') {
      return isDepositor && !signatures.some(sig => 
        sig.role === 'SENDER' && sig.status === 'signed'
      );
    }
    
    // For receiver-only deposits
    if (authorization === 'RECEIVER') {
      return !isDepositor && !signatures.some(sig => 
        sig.role === 'RECEIVER' && sig.status === 'signed'
      );
    }
    
    // For dual signature deposits
    if (authorization === 'DUAL') {
      const userRole = isDepositor ? 'SENDER' : 'RECEIVER';
      const hasUserSigned = signatures.some(
        sig => sig.role === userRole && sig.status === 'signed'
      );
      
      return !hasUserSigned;
    }
    
    return false;
  };

  const getActionButtonText = () => {
    const { status, authorization, isDepositor, signatures } = transaction;
    
    // For completed or cancelled transactions, just show Close
    if (status !== 'PENDING' || transaction.depositRecord?.state !== 'PENDING') {
      return 'Close';
    }

    // For dual signature deposits
    if (authorization === 'DUAL') {
      const userRole = isDepositor ? 'SENDER' : 'RECEIVER';
      const hasUserSigned = signatures.some(
        sig => sig.role === userRole && sig.status === 'signed'
      );
      
      if (!hasUserSigned) {
        return isDepositor ? 'Sign as Sender' : 'Sign as Receiver';
      }
      
      return 'Waiting for Other Party';
    }
    
    // For single signature deposits
    if (isDepositor && authorization === 'SENDER') {
      return 'Sign as Sender';
    }
    
    if (!isDepositor && authorization === 'RECEIVER') {
      return 'Sign as Receiver';
    }
    
    return 'Close';
  };

  const getActionButtonVariant = () => {
    const { status } = transaction;
    
    if (status === 'PENDING' && transaction.depositRecord?.state === 'PENDING') {
      return 'default';
    }
    
    return 'outline';
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: "Copied!",
          description: message,
        });
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  const getTokenIcon = (token: 'USDC' | 'USDT') => {
    return token === 'USDC' ? usdcIcon : usdtIcon;
  };

  const getAuthorizationText = (authorization: SignatureType) => {
    switch (authorization) {
      case 'SENDER':
        return 'Sender only';
      case 'RECEIVER':
        return 'Receiver only';
      case 'DUAL':
        return 'Both parties must approve';
      default:
        return authorization;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Transaction Details</DialogTitle>
        </DialogHeader>
        
        {/* Transaction Summary */}
        <Card className="p-4 border border-border rounded-lg bg-card">
          <div className="flex justify-between items-center mb-4">
            <div className="text-xl font-semibold flex items-center text-card-foreground">
              <Image 
                src={getTokenIcon(transaction.token)} 
                alt={transaction.token} 
                width={24} 
                height={24} 
                className="mr-2"
              />
              {transaction.amount.toFixed(2)} {transaction.token}
            </div>
            
            <div className="flex items-center">
              <span className={`text-xs px-2 py-1 rounded-full ${
                transaction.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                transaction.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200'
              }`}>
                {transaction.status}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">ID</p>
              <div className="flex items-center mt-1">
                <p className="font-mono text-card-foreground">{transaction.id.substring(0, 16)}...</p>
                <button 
                  onClick={() => copyToClipboard(transaction.id, 'Transaction ID copied')}
                  className="ml-2 text-muted-foreground hover:text-card-foreground"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-muted-foreground">Date</p>
              <div className="flex items-center mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                <p className="text-card-foreground">{format(transaction.createdAt, 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>
            
            <div>
              <p className="text-muted-foreground">From</p>
              <div className="flex items-center mt-1">
                <Mail className="h-4 w-4 text-muted-foreground mr-1" />
                <p className="text-card-foreground">
                  {transaction.isDepositor ? transaction.senderEmail : transaction.senderEmail || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-muted-foreground">To</p>
              <div className="flex items-center mt-1">
                <Mail className="h-4 w-4 text-muted-foreground mr-1" />
                <p className="text-card-foreground">
                  {transaction.isDepositor ? transaction.recipientEmail : transaction.recipientEmail}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-muted-foreground">Authorization</p>
              <p className="mt-1 text-card-foreground">{getAuthorizationText(transaction.authorization)}</p>
            </div>
            
            <div>
              <p className="text-muted-foreground">Deposit Index</p>
              <p className="mt-1 text-card-foreground">#{transaction.depositIndex || 0}</p>
            </div>
          </div>
          
          {transaction.transactionSignature && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm">Transaction Signature</p>
              <div className="flex items-center mt-1">
                <p className="text-xs font-mono truncate text-card-foreground">{transaction.transactionSignature}</p>
                <div className="flex ml-2">
                  <button 
                    onClick={() => copyToClipboard(
                      transaction.transactionSignature!, 
                      'Transaction signature copied'
                    )}
                    className="text-muted-foreground hover:text-card-foreground mr-1"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a 
                    href={`https://explorer.solana.com/tx/${transaction.transactionSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-card-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </Card>
        
        <div className="my-4">
          <h3 className="text-sm font-medium mb-3 text-card-foreground">Transaction Timeline</h3>
          <StatusTimeline 
            statusHistory={transaction.statusHistory}
            signatures={transaction.signatures}
          />
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isProcessing}
            className="border-border text-card-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          
          <Button 
            variant={getActionButtonVariant()} 
            onClick={handleActionClick}
            disabled={isProcessing || !canPerformAction()}
            className={`min-w-[120px] ${
              getActionButtonVariant() === 'default' 
                ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 dark:hover:bg-secondary/80'
                : 'border-border text-card-foreground hover:bg-muted'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              getActionButtonText()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}