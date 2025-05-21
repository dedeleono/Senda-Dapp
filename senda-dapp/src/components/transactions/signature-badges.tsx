import { Badge } from '@/components/ui/badge'
import { UserIcon } from 'lucide-react'
import { SignatureType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { Signature } from '@/types/transaction'
import { hasRoleSigned } from '@/utils/transaction'

interface SignatureBadgesProps {
  policy: SignatureType
  signatures: Signature[]
  isSender: boolean
  isReceiver: boolean
  className?: string
}

export function SignatureBadges({
  policy,
  signatures,
  isSender,
  isReceiver,
  className
}: SignatureBadgesProps) {
  
  

  const renderSignatureBadge = (role: SignatureType, isCurrentUser: boolean) => {
    const isSigned = hasRoleSigned(signatures, role)
    return (
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-all duration-200',
          isSigned
            ? 'bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
            : 'bg-yellow-100/50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
          isCurrentUser && !isSigned && 'animate-pulse',
          className,
        )}
      >
        <UserIcon className="w-3.5 h-3.5" />
        <span>{role === 'SENDER' ? 'Sender' : 'Receiver'}: {isSigned ? 'Approved' : 'Pending'}</span>
        {isSigned ? <span className="text-[10px]">✓</span> : <span className="text-[10px]">⏳</span>}
      </Badge>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* <div className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        policyDetails.className
      )}>
        <PolicyIcon className="w-3.5 h-3.5 mr-1.5" />
        {policyDetails.description}
      </div> */}

      {policy === 'SENDER' && renderSignatureBadge('SENDER', isSender)}
      {policy === 'RECEIVER' && renderSignatureBadge('RECEIVER', isReceiver)}
      {policy === 'DUAL' && (
        <>
          {renderSignatureBadge('SENDER', isSender)}
          {renderSignatureBadge('RECEIVER', isReceiver)}
        </>
      )}
    </div>
  )
} 