import { Badge } from '@/components/ui/badge'
import { UserIcon, UsersIcon, ShieldCheckIcon } from 'lucide-react'
import { SignatureType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface Signature {
  signer: string
  role: SignatureType
  timestamp?: Date
  status: 'signed' | 'pending'
}

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
  const getPolicyDetails = (policy: string) => {
    switch (policy.toUpperCase()) {
      case 'SENDER':
        return {
          icon: UserIcon,
          label: 'Single Signature',
          description: 'Requires sender signature',
          className: 'text-[#596f62] dark:text-[#d7dfbe] bg-[#596f62]/20 dark:bg-[#1c3144]/20',
        }
      case 'RECEIVER':
        return {
          icon: UserIcon,
          label: 'Single Signature',
          description: 'Requires receiver signature',
          className: 'text-[#596f62] dark:text-[#d7dfbe] bg-[#596f62]/20 dark:bg-[#1c3144]/20',
        }
      case 'DUAL':
        return {
          icon: UsersIcon,
          label: 'Multi-Signature',
          description: 'Requires multiple signatures',
          className: 'text-[#7ea16b] dark:text-[#7ea16b] bg-[#7ea16b]/20 dark:bg-[#7ea16b]/10',
        }
      default:
        return {
          icon: ShieldCheckIcon,
          label: policy,
          description: 'Custom policy',
          className: 'text-[#1c3144] dark:text-[#f6ead7] bg-[#f6ead7]/30 dark:bg-[#f6ead7]/10',
        }
    }
  }

  const policyDetails = getPolicyDetails(policy)
  const PolicyIcon = policyDetails.icon

  // Helper to check if a role has signed
  const hasSigned = (role: SignatureType) => {
    return signatures.some(sig => sig.role === role && sig.status === 'signed')
  }

  const renderSignatureBadge = (role: SignatureType, isCurrentUser: boolean) => {
    const isSigned = hasSigned(role)
    const signature = signatures.find(sig => sig.role === role)
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