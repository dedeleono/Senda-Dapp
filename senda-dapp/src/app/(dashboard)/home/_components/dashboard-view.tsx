'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Plus, FileText, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useWalletBalances } from '@/hooks/use-wallet-balances'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import { useWalletStore } from '@/stores/use-wallet-store'
import { TransactionStatus, TransactionType, SignatureType } from '@prisma/client'
import Image from 'next/image'
import usdcIcon from '@/public/usdc.svg'
import usdtIcon from '@/public/usdt-round.svg'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { getTransactionAge } from '@/utils/transaction'
import { parseTransactionSignatures } from '@/utils/transaction'
import { toast } from 'sonner'
import DepositModal, { DepositModalRef } from '@/components/deposit/deposit-modal'
import AddFundsModal, { AddFundsModalRef } from '@/components/deposit/add-funds-modal'
import WalletQRDialog, { WalletQRDialogRef } from './wallet-qr-dialog'

interface Transaction {
  id: string
  amount: number
  status: TransactionStatus
  type: TransactionType
  userId: string
  walletPublicKey: string
  destinationAddress: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  signature?: string
  depositRecord?: {
    id: string
    stable: 'usdc' | 'usdt'
    policy: SignatureType
    depositIndex: number
    escrowId: string
    signatures?: string[]
    state: string
    senderApproved?: boolean
    receiverApproved?: boolean
  }
  destinationUserId?: string
  destinationUser?: {
    email: string
  }
  user?: {
    email: string
  }
}

interface TransactionResponse {
  transactions: Transaction[]
}

interface StatCardProps {
  value: string | number
  label: string
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({ value, label, className }) => (
  <Card className={className}>
    <CardContent className="p-6">
      <div className="text-center">
        <p className="text-2xl md:text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </CardContent>
  </Card>
)

export default function DashboardView() {
  const { isAuthenticated, session } = useAuth()
  const { publicKey } = useWalletStore()
  const { balances } = useWalletBalances()
  const [signingTransactionId, setSigningTransactionId] = useState<string | null>(null)
  
  const depositModalRef = useRef<DepositModalRef>(null)
  const addFundsModalRef = useRef<AddFundsModalRef>(null)
  const walletQRDialogRef = useRef<WalletQRDialogRef>(null)
  
  const utils = trpc.useContext()
  
  // Calculate total balance
  const totalBalance = balances.reduce((sum, token) => sum + token.uiBalance, 0)
  const usdcBalance = balances.find(b => b.symbol === 'USDC')?.uiBalance || 0
  const usdtBalance = balances.find(b => b.symbol === 'USDT')?.uiBalance || 0

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = trpc.transactionRouter.getUserTransactions.useQuery(
    { limit: 50 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  ) as { data: TransactionResponse | undefined; isLoading: boolean }

  const { data: receivedTransactions, isLoading: isLoadingReceivedTransactions } =
    trpc.transactionRouter.getReceivedTransactions.useQuery(
      { limit: 50 },
      {
        enabled: isAuthenticated,
        retry: false,
      },
    ) as { data: TransactionResponse | undefined; isLoading: boolean }

  // Fetch paths for stats
  const { data: paths } = trpc.userRouter.getUserPaths.useQuery(
    { userId: session?.user.id as string },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  )

  const allTransactions = [...(transactions?.transactions || []), ...(receivedTransactions?.transactions || [])]
  
  // Filter active deposits
  const activeDeposits = allTransactions.filter((tx) => {
    const depositState = tx.depositRecord?.state
    const isReceiver = tx.destinationAddress === publicKey?.toString()
    const isSender = tx.userId === session?.user.id
    return depositState === 'PENDING' && (isSender || isReceiver)
  })

  // Calculate stats
  const totalTransactions = allTransactions.length
  const activePaths = paths?.paths?.length || 0
  const totalEarned = allTransactions
    .filter(tx => tx.destinationAddress === publicKey?.toString() && tx.depositRecord?.state === 'COMPLETED')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const { mutate: updateSignature } = trpc.sendaRouter.updateDepositSignature.useMutation({
    onSuccess: (data) => {
      const activeTransactionId = signingTransactionId
      if (activeTransactionId) {
        toast.dismiss(`signing-${activeTransactionId}`)
      }

      if (data.success) {
        toast.success('Transaction signed successfully!')
      }

      setSigningTransactionId(null)
      utils.transactionRouter.getUserTransactions.invalidate()
      utils.transactionRouter.getReceivedTransactions.invalidate()
    },
    onError: (error) => {
      if (signingTransactionId) {
        toast.dismiss(`signing-${signingTransactionId}`)
      }
      toast.error(error.message || 'Failed to sign transaction')
      setSigningTransactionId(null)
    },
  })

  const handleDepositComplete = (transactionId: string, depositId: string, recipientRole?: string) => {
    let message: string
    if (recipientRole === 'GUEST') {
      message = 'Deposit completed. An invitation has been sent to the recipient to claim the funds.'
    } else if (recipientRole === 'INDIVIDUAL') {
      message = 'Deposit completed. The recipient has been notified.'
    } else {
      message = 'Deposit completed successfully.'
    }
    toast.success(message)
    utils.transactionRouter.getUserTransactions.invalidate()
    utils.transactionRouter.getReceivedTransactions.invalidate()
  }

  const handleOpenDepositModal = () => {
    depositModalRef.current?.open()
  }

  const handleOpenAddFundsModal = () => {
    addFundsModalRef.current?.open()
  }

  const handleOpenWalletQR = () => {
    walletQRDialogRef.current?.open()
  }

  // Get wallet address for QR dialog
  const sendaWalletAddress = publicKey?.toString() || null

  return (
    <div className="py-4 sm:py-3 lg:py-5 md:px-1 px-6 max-w-[1400px] mx-auto">
      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="bg-primary text-primary-foreground border-0 shadow-xl mb-6 overflow-hidden relative rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent pointer-events-none" />
          <CardContent className="p-6 sm:p-8 lg:p-10 relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <p className="text-white text-sm font-bold mb-2">Total Balance</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl sm:text-5xl lg:text-6xl font-bold">${totalBalance.toFixed(0)}</span>
                  <span className="text-xl sm:text-2xl text-white">USD</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 p-0.5">
                      <Image src={usdcIcon} alt="USDC" width={16} height={16} className="w-full h-full p-0" />
                    </div>
                    <span className="text-sm font-medium">{usdcBalance.toFixed(0)} USDC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 p-0.5">
                      <Image src={usdtIcon} alt="USDT" width={16} height={16} className="w-full h-full" />
                    </div>
                    <span className="text-sm font-medium">{usdtBalance.toFixed(0)} USDT</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-[#1c3144] hover:bg-purple-50 shadow-md w-full sm:w-auto"
                  onClick={handleOpenDepositModal}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent text-white border-white/50 hover:bg-white/10 hover:border-white w-full sm:w-auto"
                  onClick={handleOpenAddFundsModal}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Funds
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        <StatCard
          value={totalTransactions}
          label="Transactions"
          className="hover:shadow-lg transition-shadow rounded-xl"
        />
        <StatCard value={activePaths} label="Active Paths" className="hover:shadow-lg transition-shadow rounded-xl" />
        <StatCard
          value={`$${totalEarned.toFixed(0)}`}
          label="Total Earned"
          className="hover:shadow-lg transition-shadow rounded-xl"
        />
      </motion.div>

      {/* Active Deposits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-0 shadow-md rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Active Deposits</CardTitle>
            <p className="text-sm text-muted-foreground">Track your active deposits</p>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions || isLoadingReceivedTransactions ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : activeDeposits.length > 0 ? (
              <div className="space-y-4">
                {activeDeposits.map((tx) => {
                  const isSender = tx.userId === session?.user.id
                  const isReceiver = tx.destinationAddress === publicKey?.toString()
                  const ageHours = getTransactionAge(tx.createdAt)
                  const signatures = parseTransactionSignatures(tx.depositRecord?.signatures || [])

                  return (
                    <div
                      key={tx.id}
                      className="relative flex items-start gap-4 p-4 bg-muted/50 rounded-lg border transition-colors hover:bg-muted/70"
                    >
                      <Avatar className="flex-shrink-0">
                        <AvatarImage src={tx.depositRecord?.stable === 'usdc' ? usdcIcon.src : usdtIcon.src} />
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">
                              {isSender ? `To: ${tx.destinationUser?.email || '—'}` : `From: ${tx.user?.email || '—'}`}
                            </h4>
                            <p className="text-sm text-muted-foreground">{ageHours}h ago</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {tx.depositRecord?.state.toUpperCase()}
                              </Badge>
                              <span className="font-semibold">
                                {tx.amount} {tx.depositRecord?.stable?.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {isSender &&
                              tx.depositRecord?.policy !== 'RECEIVER' &&
                              !signatures.some((sig) => sig.role === 'SENDER') && (
                                <Button
                                  size="sm"
                                  disabled={signingTransactionId === tx.id}
                                  onClick={() => {
                                    setSigningTransactionId(tx.id)
                                    toast.loading('Signing transaction as sender...', {
                                      id: `signing-${tx.id}`,
                                    })
                                    updateSignature({
                                      depositId: tx.depositRecord?.id || '',
                                      role: 'sender',
                                      signerId: tx.userId,
                                    })
                                  }}
                                >
                                  {signingTransactionId === tx.id ? 'Signing...' : 'Sign as Sender'}
                                </Button>
                              )}
                            {isReceiver &&
                              tx.depositRecord?.policy !== 'SENDER' &&
                              !signatures.some((sig) => sig.role === 'RECEIVER') && (
                                <Button
                                  size="sm"
                                  disabled={signingTransactionId === tx.id}
                                  onClick={() => {
                                    setSigningTransactionId(tx.id)
                                    toast.loading('Signing transaction as receiver...', {
                                      id: `signing-${tx.id}`,
                                    })
                                    updateSignature({
                                      depositId: tx.depositRecord?.id || '',
                                      role: 'receiver',
                                      signerId: tx.destinationUserId || '',
                                    })
                                  }}
                                >
                                  {signingTransactionId === tx.id ? 'Signing...' : 'Sign as Receiver'}
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                }
                title="You don't have any active deposits!"
                description="Start by buying or depositing funds"
                actionLabel="Add Funds"
                onAction={handleOpenAddFundsModal}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modals */}
      <DepositModal ref={depositModalRef} onComplete={handleDepositComplete} />
      <AddFundsModal ref={addFundsModalRef} onWalletQRSelected={handleOpenWalletQR} />
      <WalletQRDialog ref={walletQRDialogRef} walletAddress={sendaWalletAddress || ''} />
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
    <div className="text-muted-foreground mb-4">{icon}</div>
    <h3 className="text-base sm:text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
    {actionLabel && onAction && (
      <Button onClick={onAction} className="shadow-sm">
        <Plus className="mr-2 h-4 w-4" />
        {actionLabel}
      </Button>
    )}
  </div>
) 