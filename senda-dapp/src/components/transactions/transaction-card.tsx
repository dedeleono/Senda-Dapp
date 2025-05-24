'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, DollarSign, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/app/_trpc/client';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'FAILED';
export type SignatureType = 'SENDER' | 'RECEIVER' | 'DUAL';

export interface TransactionCardProps {
  id: string;
  amount: number;
  token: 'USDC' | 'USDT';
  recipientEmail: string;
  senderEmail?: string;
  createdAt: Date;
  status: TransactionStatus;
  authorization: SignatureType;
  isDepositor: boolean;
  depositId?: string;
  signerId?: string;
  onClick?: () => void;
  onSignatureComplete?: () => void;
}

export default function TransactionCard({
  id,
  amount,
  token,
  recipientEmail,
  senderEmail,
  createdAt,
  status,
  authorization,
  isDepositor,
  depositId,
  signerId,
  onClick,
  onSignatureComplete,
}: TransactionCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: updateDeposit } = trpc.sendaRouter.updateDepositSignature.useMutation({
    onSuccess: () => {
      toast.success('Transaction signed successfully');
      onSignatureComplete?.();
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sign transaction');
      setIsLoading(false);
    },
  });

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      case 'REJECTED':
      case 'FAILED':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: TransactionStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'REJECTED':
        return 'Rejected';
      case 'FAILED':
        return 'Failed';
      default:
        return status;
    }
  };

  const getAuthorizationText = (authorization: SignatureType) => {
    switch (authorization) {
      case 'SENDER':
        return 'Sender only';
      case 'RECEIVER':
        return 'Receiver only';
      case 'DUAL':
        return 'Both parties';
      default:
        return authorization;
    }
  };

  const getActionButtonText = () => {
    if (status === 'PENDING') {
      if (isDepositor && (authorization === 'SENDER' || authorization === 'DUAL')) {
        return isLoading ? 'Signing...' : 'Sign as Sender';
      } else if (!isDepositor && (authorization === 'RECEIVER' || authorization === 'DUAL')) {
        return isLoading ? 'Signing...' : 'Sign as Receiver';
      }
    }
    
    return 'View Details';
  };

  const handleActionClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (status === 'PENDING' && depositId && signerId) {
      setIsLoading(true);
      updateDeposit({
        depositId,
        role: isDepositor ? 'sender' : 'receiver',
        signerId,
      });
    } else {
      onClick?.();
    }
  };

  const getTokenIcon = (tokenSymbol: 'USDC' | 'USDT') => {
    return tokenSymbol === 'USDC' ? "usdc.svg" : "usdt-round.svg";
  };

  const shouldShowActionButton = () => {
    if (status !== 'PENDING') return false;

    // For sender-only deposits, only show if user is sender
    if (authorization === 'SENDER' && !isDepositor) return false;

    // For receiver-only deposits, only show if user is receiver
    if (authorization === 'RECEIVER' && isDepositor) return false;

    // For dual signature deposits, show for both parties
    if (authorization === 'DUAL') return true;

    return true;
  };

  return (
    <Card 
      className="w-full cursor-pointer hover:shadow-md transition-shadow bg-card text-card-foreground"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted dark:bg-muted/30 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-card-foreground">
                {isDepositor ? `To: ${recipientEmail}` : `From: ${senderEmail || 'Unknown'}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="font-medium text-card-foreground flex items-center justify-end">
                <Image 
                  src={getTokenIcon(token)}
                  alt={token}
                  width={16}
                  height={16}
                  className="mr-1"
                />
                {amount.toFixed(2)} {token}
              </div>
              <Badge className={`text-xs ${getStatusColor(status)} flex items-center space-x-1`}>
                {getStatusIcon(status)}
                <span>{getStatusText(status)}</span>
              </Badge>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground flex justify-between">
          <span>ID: {id.substring(0, 8)}...</span>
          <span>Authorization: {getAuthorizationText(authorization)}</span>
        </div>
      </CardContent>
      
      {shouldShowActionButton() && (
        <CardFooter className="px-4 py-3 border-t border-border">
          <Button 
            onClick={handleActionClick} 
            variant={status === 'PENDING' ? 'default' : 'outline'}
            size="sm"
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 dark:hover:bg-secondary/80"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getActionButtonText()}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 