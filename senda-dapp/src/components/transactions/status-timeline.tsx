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
          <div key={index} className="relative pl-8">
            {/* Vertical line */}
            {index < sortedEvents.length - 1 && (
              <div className="absolute top-6 left-4 w-1 h-full bg-gradient-to-b from-secondary/40 to-muted/10 rounded" style={{ zIndex: 0 }}></div>
            )}
            {/* Icon bubble */}
            <div className={`absolute left-0 top-2 z-10 flex items-center justify-center w-8 h-8 rounded-full shadow-md
              ${event.status.includes('COMPLETED') || event.status.includes('SIGNATURE') ? 'bg-green-100 border-2 border-green-400' :
                event.status.includes('CANCELLED') || event.status.includes('REJECTED') || event.status.includes('FAILED') ? 'bg-red-100 border-2 border-red-400' :
                event.status.includes('PENDING') ? 'bg-yellow-100 border-2 border-yellow-400' :
                'bg-muted border-2 border-muted-foreground/20'}
            `}>
              {getStatusIcon(event.status)}
            </div>
            {/* Event bubble */}
            <div className={`ml-10 p-3 rounded-lg shadow-sm border
              ${event.status.includes('COMPLETED') || event.status.includes('SIGNATURE') ? 'bg-green-50 border-green-200' :
                event.status.includes('CANCELLED') || event.status.includes('REJECTED') || event.status.includes('FAILED') ? 'bg-red-50 border-red-200' :
                event.status.includes('PENDING') ? 'bg-yellow-50 border-yellow-200' :
                'bg-muted/30 border-muted/20'}
            `}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">{getStatusText(event)}</h3>
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
      {/* Pending signatures visually distinct */}
      {pendingSignatures.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold mb-4 text-card-foreground">Pending Signatures</h3>
          <div className="space-y-4">
            {pendingSignatures.map((sig, index) => (
              <div key={index} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                  <div>
                    <span className="text-sm font-medium text-yellow-900">
                      {sig.role.charAt(0) + sig.role.slice(1).toLowerCase()} signature required
                    </span>
                    <p className="text-xs text-yellow-700">
                      {sig.signer.includes('@')
                        ? sig.signer
                        : `${sig.signer.substring(0, 4)}...${sig.signer.substring(sig.signer.length - 4)}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-100/60">
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