'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, DollarSign, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import usdcIcon from '@/public/usdc.svg';
import usdtIcon from '@/public/usdt-round.svg';
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
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    return tokenSymbol === 'USDC' ? usdcIcon : usdtIcon;
  };

  return (
    <Card 
      className="w-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {isDepositor ? `To: ${recipientEmail}` : `From: Sender`}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="font-medium text-gray-900 flex items-center justify-end">
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
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 flex justify-between">
          <span>ID: {id.substring(0, 8)}...</span>
          <span>Authorization: {getAuthorizationText(authorization)}</span>
        </div>
      </CardContent>
      
      <CardFooter className="px-4 py-3 border-t">
        <Button 
          onClick={handleActionClick} 
          variant={status === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          className="w-full bg-[#d7dfbe] text-black hover:bg-[#d7dfbe] hover:text-black"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {getActionButtonText()}
        </Button>
      </CardFooter>
    </Card>
  );
} 