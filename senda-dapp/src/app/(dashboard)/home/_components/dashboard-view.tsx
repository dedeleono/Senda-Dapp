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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { getTransactionAge } from '@/utils/transaction'
import { toast } from 'sonner'
import DepositModal, { DepositModalRef } from '@/components/deposit/deposit-modal'
import AddFundsModal, { AddFundsModalRef } from '@/components/deposit/add-funds-modal'
import WalletQRDialog, { WalletQRDialogRef } from './wallet-qr-dialog'
import TransactionDetails from '@/components/transactions/transaction-details'
import { TransactionDetailsData } from '@/types/transaction'
import { SignatureBadges } from '@/components/transactions/signature-badges'

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
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetailsData | null>(null)
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false)
  
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
  
  // Helper function to generate signatures from deposit record
  const getSignaturesFromDepositRecord = (depositRecord: Transaction['depositRecord']) => {
    if (!depositRecord) return []
    
    const signatures: { role: SignatureType; status: 'signed' | 'pending'; signer: string; timestamp?: Date }[] = []
    
    // Add sender signature status
    if (depositRecord.policy === 'SENDER' || depositRecord.policy === 'DUAL') {
      signatures.push({
        role: 'SENDER',
        status: depositRecord.senderApproved ? 'signed' : 'pending',
        signer: 'sender',
        timestamp: depositRecord.senderApproved ? new Date() : undefined,
      })
    }
    
    // Add receiver signature status
    if (depositRecord.policy === 'RECEIVER' || depositRecord.policy === 'DUAL') {
      signatures.push({
        role: 'RECEIVER',
        status: depositRecord.receiverApproved ? 'signed' : 'pending',
        signer: 'receiver',
        timestamp: depositRecord.receiverApproved ? new Date() : undefined,
      })
    }
    
    return signatures
  }
  
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
  const totalVolume = allTransactions
    .filter(tx => tx.destinationAddress === publicKey?.toString() && tx.depositRecord?.state === 'COMPLETED')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const { mutate: updateSignature } = trpc.sendaRouter.updateDepositSignature.useMutation({
    onSuccess: (data) => {
      const activeTransactionId = signingTransactionId
      if (activeTransactionId) {
        toast.dismiss(`signing-${activeTransactionId}`)
      }

      // Handle different response scenarios
      if (data.success) {
        // Transaction was fully executed and completed
        if ('data' in data && data.data && 'state' in data.data && data.data.state === 'COMPLETED') {
          toast.success('🎉 Transaction completed! Funds have been released.')
        } else {
          toast.success('Transaction completed successfully!')
        }
      } else if ('data' in data && data.data && 'executed' in data.data && data.data.executed === false) {
        // Signature was recorded successfully, but waiting for other party
        toast.success(`✅ Your signature has been recorded. ${data.data.message || 'Waiting for other party to sign.'}`)
      } else {
        // This is an actual error
        const errorMessage = 'error' in data && data.error ? data.error.message : 'Failed to sign transaction'
        toast.error(errorMessage)
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

  const handleOpenTransactionDetails = (tx: Transaction) => {
    const isSender = tx.userId === session?.user.id
    
    const signatures = getSignaturesFromDepositRecord(tx.depositRecord)

    const transformedTransaction: TransactionDetailsData = {
      id: tx.depositRecord?.id || tx.id,
      amount: tx.amount,
      token: (tx.depositRecord?.stable?.toUpperCase() || 'USDC') as 'USDC' | 'USDT',
      recipientEmail: tx.destinationUser?.email || '',
      senderEmail: tx.user?.email || '',
      createdAt: new Date(tx.createdAt),
      status: tx.status,
      authorization: (tx.depositRecord?.policy || 'SENDER') as SignatureType,
      isDepositor: isSender,
      signatures,
      statusHistory: [
        {
          status: 'CREATED',
          timestamp: new Date(tx.createdAt),
        },
        ...(tx.status === 'COMPLETED' && tx.completedAt
          ? [
              {
                status: 'COMPLETED',
                timestamp: new Date(tx.completedAt),
              },
            ]
          : []),
      ],
      depositIndex: tx.depositRecord?.depositIndex || 0,
      transactionSignature: tx.signature,
      senderPublicKey: tx.walletPublicKey,
      receiverPublicKey: tx.destinationAddress || '',
      depositRecord: tx.depositRecord ? {
        state: tx.depositRecord.state
      } : undefined
    }

    setSelectedTransaction(transformedTransaction)
    setIsTransactionDetailsOpen(true)
  }

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
                      <Image src={"usdc.svg"} alt="USDC" width={16} height={16} className="w-full h-full p-0" />
                    </div>
                    <span className="text-sm font-medium">{usdcBalance.toFixed(0)} USDC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 p-0.5">
                      <Image src={"usdt-round.svg"} alt="USDT" width={16} height={16} className="w-full h-full" />
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
          value={`$${totalVolume.toFixed(0)}`}
          label="Total Volume"
          className="hover:shadow-lg transition-shadow rounded-xl"
        />
      </motion.div>

      {/* Active Deposits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Active Deposits</CardTitle>
                <p className="text-sm text-white/80 mt-1">Track and manage your pending transactions</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-4">
            {isLoadingTransactions || isLoadingReceivedTransactions ? (
              <div className="flex justify-center py-16">
                <div className="relative">
                  <div className="h-12 w-12 animate-spin rounded-full border-3 border-gray-200 border-t-gray-600" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-gray-600 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : activeDeposits.length > 0 ? (
              <div className="space-y-4">
                {activeDeposits.map((tx) => {
                  const isSender = tx.userId === session?.user.id
                  const isReceiver = tx.destinationAddress === publicKey?.toString()
                  const ageHours = getTransactionAge(tx.createdAt)
                  const signatures = getSignaturesFromDepositRecord(tx.depositRecord)
                  const needsSenderSignature = isSender && tx.depositRecord?.policy !== 'RECEIVER' && !signatures.some((sig) => sig.role === 'SENDER' && sig.status === 'signed')
                  const needsReceiverSignature = isReceiver && tx.depositRecord?.policy !== 'SENDER' && !signatures.some((sig) => sig.role === 'RECEIVER' && sig.status === 'signed')
                  const hasUserSigned = (isSender && signatures.some((sig) => sig.role === 'SENDER' && sig.status === 'signed')) || 
                                       (isReceiver && signatures.some((sig) => sig.role === 'RECEIVER' && sig.status === 'signed'))
                  const allSignaturesComplete = tx.depositRecord?.policy === 'DUAL' 
                    ? signatures.every((sig) => sig.status === 'signed')
                    : signatures.some((sig) => sig.status === 'signed')

                  return (
                    <div
                      key={tx.id}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <div
                        className="relative flex flex-col sm:flex-row gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-lg cursor-pointer"
                        onClick={() => handleOpenTransactionDetails(tx)}
                      >
                        {/* Token Icon and Amount */}
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <Avatar className="h-12 w-12 ring-4 ring-white dark:ring-gray-900 shadow-lg">
                              <AvatarImage src={tx.depositRecord?.stable === 'usdc' ? "usdc.svg" : "usdt-round.svg"} />
                            </Avatar>
                            {(needsSenderSignature || needsReceiverSignature) && (
                              <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
                            )}
                          </div>

                          <div className="flex-1">
                            {/* Transaction Header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                  {isSender ? `To: ${tx.destinationUser?.email || 'Unknown'}` : `From: ${tx.user?.email || 'Unknown'}`}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {tx.amount} <span className="text-base font-medium text-gray-500">{tx.depositRecord?.stable?.toUpperCase()}</span>
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 dark:bg-yellow-400 mr-1.5" />
                                    Pending
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {ageHours}h ago
                              </p>
                            </div>

                            {/* Signature Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <SignatureBadges
                                signatures={signatures}
                                isSender={isSender}
                                isReceiver={isReceiver} 
                                policy={(tx.depositRecord?.policy || 'SENDER') as SignatureType}
                                className="flex-wrap"
                              />

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                {allSignaturesComplete ? (
                                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Processing transaction...
                                  </div>
                                ) : hasUserSigned ? (
                                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Waiting for other party
                                  </div>
                                ) : (
                                  <>
                                    {needsSenderSignature && (
                                      <Button
                                        size="sm"
                                        disabled={signingTransactionId === tx.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
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
                                        className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        {signingTransactionId === tx.id ? (
                                          <>
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                                            Signing...
                                          </>
                                        ) : (
                                          'Sign as Sender'
                                        )}
                                      </Button>
                                    )}
                                    {needsReceiverSignature && (
                                      <Button
                                        size="sm"
                                        disabled={signingTransactionId === tx.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSigningTransactionId(tx.id)
                                          toast.loading('Signing transaction as receiver...', {
                                            id: `signing-${tx.id}`,
                                          })
                                          updateSignature({
                                            depositId: tx.depositRecord?.id || '',
                                            role: 'receiver',
                                            signerId: tx.destinationUserId || session?.user.id || '',
                                          })
                                        }}
                                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        {signingTransactionId === tx.id ? (
                                          <>
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                                            Signing...
                                          </>
                                        ) : (
                                          'Sign as Receiver'
                                        )}
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Authorization Policy Indicator */}
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Authorization: <span className="font-medium text-gray-700 dark:text-gray-300">{tx.depositRecord?.policy || 'SENDER'}</span>
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tx.depositRecord?.policy === 'DUAL' ? (
                                    <span>
                                      {signatures.filter(s => s.status === 'signed').length} of {signatures.length} signatures
                                    </span>
                                  ) : (
                                    <span>
                                      {signatures.some(s => s.status === 'signed') ? 'Signed' : 'Pending signature'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
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
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                  </div>
                }
                title="No Active Deposits"
                description="You don't have any pending transactions. Start by adding funds or sending money to someone."
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
      
      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetails
          isOpen={isTransactionDetailsOpen}
          onClose={() => {
            setIsTransactionDetailsOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={selectedTransaction}
        />
      )}
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
  <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      {icon}
    </motion.div>
    <motion.h3 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3"
    >
      {title}
    </motion.h3>
    <motion.p 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-8 max-w-md px-4"
    >
      {description}
    </motion.p>
    {actionLabel && onAction && (
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Button 
          onClick={onAction} 
          size="lg"
          className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="mr-2 h-5 w-5" />
          {actionLabel}
        </Button>
      </motion.div>
    )}
  </div>
) 