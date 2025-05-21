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
  Copy, Loader2, ExternalLink, Calendar, Mail 
} from 'lucide-react';
import { format } from 'date-fns';
import { TransactionStatus, SignatureType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { useSendaProgram } from '@/stores/use-senda-program';
import { SignatureBadges } from './signature-badges'
import { Separator } from '../ui/separator';
import { TransactionDetailsData } from '@/types/transaction';
import { getAuthorizationText, getStatusBadgeStyles } from '@/types/transaction';
import { canPerformAction, getActionButtonText } from '@/utils/transaction';
import { cn } from '@/lib/utils';

interface TransactionDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionDetailsData;
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
      const { status, authorization, isDepositor, id } = transaction;
      
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
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process transaction',
      });
    } finally {
      setIsProcessing(false);
      onClose();
    }
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
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                getStatusBadgeStyles(transaction.status)
              )}>
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
          <Separator className="my-4" />
          <SignatureBadges
            policy={transaction.authorization}
            signatures={transaction.signatures}
            isSender={transaction.isDepositor}
            isReceiver={!transaction.isDepositor}
          />
        </Card>

        <div className="my-4">
          <h3 className="text-sm font-medium mb-3 text-card-foreground">Transaction Timeline</h3>
          <StatusTimeline statusHistory={transaction.statusHistory} signatures={transaction.signatures} />
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
            variant={transaction.status === 'PENDING' && transaction.depositRecord?.state === 'PENDING' ? 'default' : 'outline'}
            onClick={handleActionClick}
            disabled={isProcessing || !canPerformAction(
              transaction.status,
              transaction.authorization,
              transaction.isDepositor,
              transaction.signatures,
              transaction.depositRecord?.state
            )}
            className={`min-w-[120px] ${
              transaction.status === 'PENDING' && transaction.depositRecord?.state === 'PENDING'
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
              getActionButtonText(
                transaction.status,
                transaction.authorization,
                transaction.isDepositor,
                transaction.signatures
              )
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}