'use client';

import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { SignatureType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  status: string;
  timestamp: Date;
  actor?: string;
}

interface SignatureEvent {
  signer: string;
  role: SignatureType;
  timestamp?: Date;
  status: 'signed' | 'pending';
}

interface StatusTimelineProps {
  statusHistory: TimelineEvent[];
  signatures: SignatureEvent[];
}

export default function StatusTimeline({ statusHistory, signatures }: StatusTimelineProps) {
  const allEvents = [...statusHistory];
  
  // Sort and process signatures
  const sortedSignatures = [...signatures].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  // Add signed signatures to events
  sortedSignatures.forEach(sig => {
    if (sig.timestamp && sig.status === 'signed') {
      allEvents.push({
        status: `SIGNATURE_${sig.role.toUpperCase()}`,
        timestamp: sig.timestamp,
        actor: sig.signer
      });
    }
  });
  
  const sortedEvents = [...allEvents].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  const getStatusIcon = (status: string) => {
    if (status.includes('COMPLETED') || status.includes('SIGNATURE')) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.includes('CANCELLED') || status.includes('REJECTED') || status.includes('FAILED')) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (status.includes('PENDING')) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = (event: TimelineEvent) => {
    const status = event.status;
    
    if (status.includes('SIGNATURE')) {
      const role = status.split('_')[1];
      return `${role.charAt(0) + role.slice(1).toLowerCase()} signature added`;
    }
    
    switch (status) {
      case 'CREATED':
        return 'Deposit created';
      case 'PENDING':
        return 'Awaiting signatures';
      case 'COMPLETED':
        return 'Deposit completed';
      case 'CANCELLED':
        return 'Deposit cancelled';
      case 'REJECTED':
        return 'Withdrawal rejected';
      case 'FAILED':
        return 'Transaction failed';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Get pending signatures
  const pendingSignatures = sortedSignatures.filter(sig => sig.status === 'pending');

  // Get signed signatures that aren't in the timeline yet
  const signedSignatures = sortedSignatures.filter(sig => 
    sig.status === 'signed' && 
    sig.timestamp &&
    !sortedEvents.some(event => 
      event.status === `SIGNATURE_${sig.role}` && 
      event.timestamp.getTime() === sig.timestamp?.getTime()
    )
  );

  // Add any missing signed signatures to the timeline
  signedSignatures
    .filter(sig => sig.timestamp !== undefined)
    .forEach(sig => {
      sortedEvents.push({
        status: `SIGNATURE_${sig.role}`,
        timestamp: sig.timestamp as Date,
        actor: sig.signer
      });
    });

  // Re-sort events after adding signatures
  sortedEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {sortedEvents.map((event, index) => (
          <div key={index} className="relative pl-6">
            {index < sortedEvents.length - 1 && (
              <div className="absolute top-5 bottom-0 left-[10px] w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            )}
            
            <div className="absolute left-0 top-0 bg-white dark:bg-background">
              {getStatusIcon(event.status)}
            </div>
            
            <div className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-card-foreground">{getStatusText(event)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(event.timestamp)}</p>
                </div>
                
                {event.actor && (
                  <div className="ml-4 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    {event.actor.includes('@') 
                      ? event.actor 
                      : `${event.actor.substring(0, 4)}...${event.actor.substring(event.actor.length - 4)}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {sortedEvents.length === 0 && (
          <div className="text-sm text-muted-foreground italic">
            No transaction events found
          </div>
        )}
      </div>
      
      {pendingSignatures.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3 text-card-foreground">Required Signatures</h3>
          
          <div className="space-y-3">
            {pendingSignatures.map((sig, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                  <div>
                    <span className="text-sm text-card-foreground">
                      {sig.role.charAt(0) + sig.role.slice(1).toLowerCase()} signature required
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {sig.signer.includes('@') 
                        ? sig.signer 
                        : `${sig.signer.substring(0, 4)}...${sig.signer.substring(sig.signer.length - 4)}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 