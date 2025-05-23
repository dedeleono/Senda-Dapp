'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowUp,
  PlusIcon,
  ArrowDown,
  ClockIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserIcon,
  ClipboardIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import path from '@/public/2.svg'
import IceDoodle from '@/public/IceCreamDoodle.svg'
import Image from 'next/image'
import WalletQRDialog, { WalletQRDialogRef } from './wallet-qr-dialog'
import { useWalletBalances } from '@/hooks/use-wallet-balances'
import { TransactionStatus, TransactionType, SignatureType } from '@prisma/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

import usdcIcon from '@/public/usdc.svg'
import usdtIcon from '@/public/usdt-round.svg'
import DepositModal, { DepositModalRef } from '@/components/deposit/deposit-modal'
import TransactionDetails from '@/components/transactions/transaction-details'
import { Badge } from '@/components/ui/badge'
import { useWalletStore } from '@/stores/use-wallet-store'
import WithdrawModal, { WithdrawModalRef } from '@/components/withdraw/withdraw-modal'
import AddFundsModal, { AddFundsModalRef } from '@/components/deposit/add-funds-modal'
import { motion } from 'framer-motion'
import { Sparklines } from 'react-sparklines'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { SignatureBadges } from '@/components/transactions/signature-badges'
import { TransactionDetailsData } from '@/types/transaction'
import { parseTransactionSignatures, getTransactionAge } from '@/utils/transaction'
import { getStatusBadgeStyles } from '@/types/transaction'
import { cn } from '@/lib/utils'
import { WalletOnboardingTour } from './wallet-onboarding'

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

interface Path {
  id: string
  createdAt: string
  updatedAt: string
  state: string
  senderPublicKey: string
  receiverPublicKey: string
  depositCount: number
  depositedUsdc: number
  depositedUsdt: number
  sender: {
    email: string
    name: string | null
    image: string | null
  }
  receiver: {
    email: string
    name: string | null
    image: string | null
  }
}

interface PathsResponse {
  paths: Path[]
}

interface TransactionSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  status: 'COMPLETED' | 'PENDING' | 'WAITING'
  transactionSignature?: string
  message?: string
  amount?: number
  token?: 'USDC' | 'USDT'
  recipient?: string
  depositId?: string
}

const TransactionSuccessModal = ({
  isOpen,
  onClose,
  status,
  transactionSignature,
  message,
  amount,
  token,
  recipient,
  depositId,
}: TransactionSuccessModalProps) => {
  const handleCopySignature = () => {
    if (transactionSignature) {
      navigator.clipboard.writeText(transactionSignature)
      toast.success('Transaction signature copied to clipboard')
    }
  }

  const handleOpenExplorer = () => {
    if (transactionSignature) {
      // Open Solana Explorer in a new tab - using devnet for development
      const explorerUrl = `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
      window.open(explorerUrl, '_blank')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {status === 'COMPLETED'
              ? 'Transaction Complete'
              : status === 'PENDING'
                ? 'Transaction Pending'
                : 'Waiting for Signatures'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center justify-center gap-4">
            {status === 'COMPLETED' ? (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            ) : status === 'PENDING' ? (
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <ClockIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <UsersIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            )}

            {amount && token && (
              <div className="flex items-center gap-2 mt-2">
                <Image src={token === 'USDC' ? usdcIcon : usdtIcon} alt={token} width={20} height={20} />
                <span className="text-xl font-semibold">
                  {amount} {token}
                </span>
              </div>
            )}

            {recipient && <div className="text-muted-foreground text-sm">To: {recipient}</div>}

            <div className="mt-2 text-center">
              {message ? (
                <p className="text-muted-foreground">{message}</p>
              ) : status === 'COMPLETED' ? (
                <p className="text-muted-foreground">
                  Your transaction has been successfully processed and recorded on the blockchain.
                </p>
              ) : status === 'PENDING' ? (
                <p className="text-muted-foreground">
                  Your transaction is being processed. It may take a few moments to complete.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Waiting for all required signatures to complete this transaction.
                </p>
              )}
            </div>

            {transactionSignature && (
              <div className="mt-4 w-full">
                <p className="text-sm text-muted-foreground mb-2">Transaction Signature:</p>
                <div className="border border-border rounded-md p-3 bg-muted/30 relative">
                  <code className="text-xs break-all font-mono">{transactionSignature}</code>
                  <Button size="sm" variant="ghost" className="absolute right-2 top-2" onClick={handleCopySignature}>
                    <ClipboardIcon className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={handleOpenExplorer}>
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  View on Solana Explorer
                </Button>
              </div>
            )}

            {depositId && (
              <div className="mt-2 w-full">
                <p className="text-sm text-muted-foreground mb-2">Deposit ID:</p>
                <div className="border border-border rounded-md p-3 bg-muted/30">
                  <code className="text-xs break-all font-mono">{depositId}</code>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SendaWallet() {
  const { isAuthenticated, session } = useAuth()
  const walletQRDialogRef = useRef<WalletQRDialogRef>(null)
  const depositModalRef = useRef<DepositModalRef>(null)
  const withdrawModalRef = useRef<WithdrawModalRef>(null)
  const addFundsModalRef = useRef<AddFundsModalRef>(null)

  const utils = trpc.useContext()

  const { publicKey } = useWalletStore()
  const sendaWalletAddress = publicKey?.toString() || null

  const { error, balances } = useWalletBalances()

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetailsData | null>(null)
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false)
  const [signingTransactionId, setSigningTransactionId] = useState<string | null>(null)

  const [successModalState, setSuccessModalState] = useState<{
    isOpen: boolean
    status: 'COMPLETED' | 'PENDING' | 'WAITING'
    signature?: string
    message?: string
    amount?: number
    token?: 'USDC' | 'USDT'
    recipient?: string
    depositId?: string
  }>({
    isOpen: false,
    status: 'COMPLETED',
  })

  const { data: transactions, isLoading: isLoadingTransactions } = trpc.transactionRouter.getUserTransactions.useQuery(
    { limit: 10 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  ) as { data: TransactionResponse | undefined; isLoading: boolean }

  const { data: receivedTransactions, isLoading: isLoadingReceivedTransactions } =
    trpc.transactionRouter.getReceivedTransactions.useQuery(
      { limit: 10 },
      {
        enabled: isAuthenticated,
        retry: false,
      },
    ) as { data: TransactionResponse | undefined; isLoading: boolean }

  const allTransactions = [...(transactions?.transactions || []), ...(receivedTransactions?.transactions || [])]

  const { data: paths, isLoading: isLoadingPaths } = trpc.userRouter.getUserPaths.useQuery(
    { userId: session?.user.id as string },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  ) as { data: PathsResponse | undefined; isLoading: boolean }

  console.log('Auth status:', isAuthenticated)
  console.log('Session:', session?.user.id)
  console.log('Public key:', publicKey?.toString())
  console.log('Paths query response:', paths)

  console.log('Current transactions state:', {
    isLoading: isLoadingTransactions || isLoadingReceivedTransactions,
    hasData: !!transactions || !!receivedTransactions,
    sentTransactionCount: transactions?.transactions?.length || 0,
    receivedTransactionCount: receivedTransactions?.transactions?.length || 0,
    allTransactions,
  })

  const handleOpenWalletQR = () => {
    walletQRDialogRef.current?.open()
  }

  const handleOpenDepositModal = () => {
    depositModalRef.current?.open()
  }

  const handleOpenWithdrawModal = () => {
    withdrawModalRef.current?.open()
  }

  const handleOpenAddFundsModal = () => {
    addFundsModalRef.current?.open()
  }

  const handleDepositComplete = (transactionId: string, depositId: string, recipientRole?: string) => {
    console.log('Deposit completed:', { transactionId, depositId, recipientRole })

    let message: string
    if (recipientRole === 'GUEST') {
      message = 'Deposit completed. An invitation has been sent to the recipient to claim the funds.'
    } else if (recipientRole === 'INDIVIDUAL') {
      message = 'Deposit completed. The recipient has been notified.'
    } else {
      message = 'Deposit completed successfully.'
    }

    toast.success(message)
  }

  const handleOpenTransactionDetails = (transaction: Transaction) => {
    console.log('Opening transaction details for:', transaction)
    const depositIndex = transaction.depositRecord?.depositIndex
    if (typeof depositIndex !== 'number') {
      console.error('Invalid deposit index:', depositIndex)
      return
    }

    const senderPublicKey = transaction.walletPublicKey
    const receiverPublicKey = transaction.destinationAddress

    if (!senderPublicKey || !receiverPublicKey) {
      console.error('Missing required public keys:', { senderPublicKey, receiverPublicKey })
      return
    }

    console.log('Transaction deposit record:', transaction.depositRecord)

    const signatures = parseTransactionSignatures(transaction.depositRecord?.signatures || [])

    const transactionDetails: TransactionDetailsData = {
      id: transaction.depositRecord?.id || '',
      amount: transaction.amount,
      token: transaction.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
      recipientEmail: transaction.destinationUserId ? (transaction.destinationUser?.email as string) : '',
      senderEmail: transaction.user?.email || '',
      createdAt: new Date(transaction.createdAt),
      status:
        transaction.depositRecord?.state === 'COMPLETED'
          ? ('COMPLETED' as TransactionStatus)
          : transaction.depositRecord?.state === 'CANCELLED'
            ? ('CANCELLED' as TransactionStatus)
            : transaction.status,
      authorization: transaction.depositRecord?.policy as SignatureType,
      isDepositor: transaction.userId === session?.user.id,
      signatures,
      statusHistory: [
        {
          status: transaction.depositRecord?.state as string,
          timestamp: new Date(transaction.createdAt),
          actor: transaction.userId,
        },
      ],
      depositIndex,
      transactionSignature: transaction.signature,
      senderPublicKey,
      receiverPublicKey,
      depositRecord: transaction.depositRecord,
    }

    console.log('Setting transaction details:', transactionDetails)
    setSelectedTransaction(transactionDetails)
    setIsTransactionDetailsOpen(true)
  }

  const { mutate: updateSignature } = trpc.sendaRouter.updateDepositSignature.useMutation({
    onSuccess: (data) => {
      console.log('Signature update mutation succeeded:', data)

      // Find the active transaction
      const activeTransactionId = signingTransactionId
      if (activeTransactionId) {
        // Dismiss the loading toast
        toast.dismiss(`signing-${activeTransactionId}`)
      }

      if (data.success) {
        if ('data' in data && data.data && typeof data.data === 'object') {
          if ('state' in data.data && data.data.state === 'COMPLETED') {
            const transactionDetails = allTransactions.find((tx) => tx.depositRecord?.id === (data.data as any).id)

            // Show success modal instead of toast
            setSuccessModalState({
              isOpen: true,
              status: 'COMPLETED',
              signature: 'signature' in data.data ? (data.data.signature as string) : undefined,
              message: 'Transaction completed successfully!',
              amount: transactionDetails?.amount,
              token: transactionDetails?.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
              recipient: transactionDetails?.destinationUser?.email || undefined,
              depositId: 'id' in data.data ? (data.data as any).id : undefined,
            })

            toast.success('Transaction completed successfully!', {
              duration: 3000,
            })
          } else {
            // Transaction is awaiting another signature
            toast.success('Transaction signed successfully', {
              duration: 3000,
            })

            // Check if we need to wait for another signature
            if ('message' in data.data && data.data.message && data.data.message.includes('Waiting for')) {
              // Find the transaction details
              const depositId = 'id' in data.data ? (data.data as any).id : undefined
              const transactionDetails = allTransactions.find((tx) => tx.depositRecord?.id === depositId)

              // Show waiting modal
              setSuccessModalState({
                isOpen: true,
                status: 'WAITING',
                message: data.data.message as string,
                amount: transactionDetails?.amount,
                token: transactionDetails?.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
                recipient: transactionDetails?.destinationUser?.email || undefined,
                depositId,
              })
            }
          }
        } else {
          toast.success('Transaction signed successfully', {
            duration: 3000,
          })
        }
      } else if ('data' in data && data.data && 'message' in data.data) {
        toast.info(data.data.message as string, {
          duration: 3000,
        })
      }

      setSigningTransactionId(null)
      utils.transactionRouter.getUserTransactions.invalidate()
      utils.transactionRouter.getReceivedTransactions.invalidate()
    },
    onError: (error) => {
      console.error('Signature update mutation failed:', error)

      // Dismiss the loading toast if there's an active transaction
      if (signingTransactionId) {
        toast.dismiss(`signing-${signingTransactionId}`)
      }

      toast.error(error.message || 'Failed to sign transaction', {
        duration: 3000,
      })
      setSigningTransactionId(null)
    },
  })

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Error loading balances: {error}</p>
        </CardContent>
      </Card>
    )
  }

  const totalBalance = balances.reduce((sum, token) => sum + token.uiBalance, 0)

  const getPolicyDetails = (policy: string, history: boolean = false) => {
    switch (policy.toUpperCase()) {
      case 'SENDER':
        return {
          icon: UserIcon,
          label: 'Single Signature',
          description: !history ? 'Requires sender signature' : 'Signed by sender',
          className: 'text-info dark:text-secondary bg-info/20 dark:bg-background/20',
        }
      case 'RECEIVER':
        return {
          icon: UserIcon,
          label: 'Single Signature',
          description: !history ? 'Requires receiver signature' : 'Signed by receiver',
          className: 'text-info dark:text-secondary bg-info/20 dark:bg-background/20',
        }
      case 'DUAL':
        return {
          icon: UsersIcon,
          label: 'Multi-Signature',
          description: !history ? 'Requires multiple signatures' : 'Signed by both',
          className: 'text-success bg-success/20 dark:bg-success/10',
        }
      default:
        return {
          icon: ShieldCheckIcon,
          label: policy,
          description: 'Custom policy',
          className: 'text-foreground dark:text-accent bg-accent/30 dark:bg-accent/10',
        }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-full mx-auto md:flex-row md:max-w-4xl">
      <WalletOnboardingTour />
      <main className="flex-1 p-6 space-y-6 md:min-w-4xl">
        <Card className="bg-card p-8 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-3">
              {/* Total Balance */}
              <h2 data-tour="total-balance" className="md:text-4xl text-3xl font-bold text-card-foreground text-nowrap">
                ${totalBalance.toFixed(0)}
                <small className="text-muted-foreground text-xs ml-1">USD</small>
              </h2>

              <div data-tour="token-balances" className="flex gap-1 md:gap-2 items-center -ml-2 md:-ml-3">
                {balances.map((token) => (
                  <div key={token.mint} className="items-center flex">
                    <div className="w-auto rounded-full mr-0.5 md:mr-1 flex items-center justify-center">
                      <Image
                        src={token.symbol === 'USDC' ? usdcIcon : usdtIcon}
                        alt={token.symbol}
                        width={100}
                        height={100}
                        className={`${token.symbol === 'USDC' ? 'w-8 h-8 md:w-[56px] md:h-[56px]' : 'w-6 h-6 md:w-7 md:h-7'}`}
                      />
                    </div>
                    <span
                      className={`text-card-foreground ${token.symbol === 'USDC' ? '-ml-2 md:-ml-3.5' : 'text-muted-foreground'}`}
                    >
                      <span className="font-medium text-base md:text-lg">
                        {token.uiBalance.toFixed(0)}
                        <small className="text-muted-foreground text-[8px] md:text-[10px] ml-0.5 md:ml-1">
                          {token.symbol}
                        </small>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div data-tour="wallet-address" className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 relative">
              <Image src={IceDoodle.src} alt="You've got this!" fill className="object-contain" />
            </div>
          </div>

          <div className="md:mt-3 mt-7 grid md:grid-cols-4 grid-cols-1 md:gap-2 gap-3 md:w-5/6">
            <Button
              data-tour="send-button"
              onClick={handleOpenDepositModal}
              variant="default"
              className="bg-secondary text-secondary-foreground font-semibold md:h-auto h-12 hover:!scale-103 hover:!bg-secondary/90 dark:hover:!bg-secondary/80 hover:!font-bold transition-all duration-300 cursor-pointer"
            >
              Send <ArrowUp className="h-4 w-4" />
            </Button>

            <Button
              data-tour="add-funds"
              onClick={handleOpenAddFundsModal}
              variant="default"
              className="bg-accent text-accent-foreground hover:!bg-accent/90 dark:hover:!bg-accent/80 hover:!font-bold hover:!scale-103 font-semibold w-full transition-all duration-300 cursor-pointer md:h-auto h-12"
            >
              Add Funds <PlusIcon className="h-4 w-4" />
            </Button>

            <Button
              data-tour="withdraw"
              variant="ghost"
              className="border border-secondary text-card-foreground font-semibold hover:!bg-secondary/10 hover:!scale-103 hover:!text-card-foreground hover:!border-secondary transition-all duration-300 cursor-pointer md:h-auto h-12"
              onClick={handleOpenWithdrawModal}
            >
              Withdraw <ArrowDown className="h-4 w-4" />
            </Button>

            {/* <Button
              variant="ghost"
              className="border border-secondary text-card-foreground font-semibold hover:!bg-secondary/10 hover:!scale-103 hover:!text-card-foreground hover:!border-secondary transition-all duration-300 cursor-pointer md:h-auto h-12"
              onClick={handleOpenWalletQR}
            >
              Your Senda Wallet <Wallet className="h-4 w-4" />
            </Button> */}

            <WalletQRDialog ref={walletQRDialogRef} walletAddress={sendaWalletAddress || ''} />
            <DepositModal ref={depositModalRef} onComplete={handleDepositComplete} />
            <WithdrawModal ref={withdrawModalRef} />
            <AddFundsModal ref={addFundsModalRef} onWalletQRSelected={handleOpenWalletQR} />
          </div>
        </Card>

        <Card className="bg-card rounded-2xl shadow-md">
          <Tabs defaultValue="deposits" className="p-0">
            <div className="overflow-x-auto">
              <TabsList className="w-full grid grid-cols-3 bg-transparent border-b border-border p-0 rounded-none h-auto">
                <TabsTrigger
                  data-tour="paths-tab"
                  value="paths"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-secondary data-[state=active]:shadow-none rounded-none rounded-tl-lg data-[state=active]:text-card-foreground data-[state=active]:font-bold"
                >
                  My Paths
                </TabsTrigger>

                <TabsTrigger
                  data-tour="deposits-tab"
                  value="deposits"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-secondary data-[state=active]:shadow-none rounded-none data-[state=active]:text-card-foreground data-[state=active]:font-bold"
                >
                  Active deposits
                </TabsTrigger>
                <TabsTrigger
                  data-tour="history-tab"
                  value="history"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-secondary data-[state=active]:shadow-none rounded-none rounded-tr-lg data-[state=active]:text-card-foreground data-[state=active]:font-bold"
                >
                  Activity History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="h-[350px]">
              <ScrollArea className="h-full">
                <TabsContent
                  value="paths"
                  className="p-4 mt-0 min-h-[350px] bg-foreground border-none rounded-b-xl flex-1"
                >
                  {isLoadingPaths ? (
                    <div className="py-12 flex justify-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-secondary border-t-transparent drop-shadow-lg" />
                    </div>
                  ) : paths && paths.paths.length > 0 ? (
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.05,
                        type: 'spring',
                        stiffness: 100,
                        damping: 15,
                      }}
                    >
                      {paths.paths.map((path) => {
                        const isSender = path.senderPublicKey === publicKey?.toString()
                        const other = isSender ? path.receiver : path.sender

                        return (
                          <div
                            key={path.id}
                            className="group relative bg-white dark:bg-background rounded-xl p-6 
                              border border-border/5 hover:border-secondary/20
                              shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                              hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]
                              transition-all duration-300"
                          >
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center justify-end gap-4">
                                  <div className="text-sm">
                                    <p className="font-medium text-card-foreground">You</p>
                                    <p className="truncate max-w-[140px] text-xs text-muted-foreground/70">
                                      {publicKey?.toString()}
                                    </p>
                                  </div>
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-[2px]" />
                                    <Avatar className="h-11 w-11 border-2 border-background/80">
                                      <AvatarImage src={session?.user?.image || ''} alt="User Avatar" />
                                      <AvatarFallback>{session?.user.email?.slice(0, 1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-[2px] w-14 bg-gradient-to-r from-secondary/30 to-accent/30" />
                                  <Badge
                                    variant="outline"
                                    className="bg-white dark:bg-background text-accent-foreground border-accent/20 px-3"
                                  >
                                    {path.depositCount} deposit{path.depositCount === 1 ? '' : 's'}
                                  </Badge>
                                  <div className="h-[2px] w-14 bg-gradient-to-r from-accent/30 to-secondary/30" />
                                </div>
                                <Sparklines limit={5} width={100} height={20} margin={5} />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-[2px]" />
                                    <Avatar className="h-11 w-11 border-2 border-background/80">
                                      <AvatarImage src={other.image || ''} alt="User Avatar" />
                                      <AvatarFallback>{other.email?.slice(0, 1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div className="text-sm">
                                    <p className="font-medium text-card-foreground">{other.email}</p>
                                    <p className="truncate max-w-[140px] text-xs text-muted-foreground/70">
                                      {isSender ? path.receiverPublicKey : path.senderPublicKey}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {(path.depositedUsdc > 0 || path.depositedUsdt > 0) && (
                              <div className="mt-5 flex justify-center gap-3">
                                {path.depositedUsdc > 0 && (
                                  <div className="bg-white dark:bg-background rounded-lg px-4 py-2 inline-flex items-center gap-2.5 border border-border/5">
                                    <Image src={usdcIcon} alt="USDC" width={22} height={22} className="opacity-90" />
                                    <span className="font-medium text-card-foreground">{path.depositedUsdc} USDC</span>
                                  </div>
                                )}
                                {path.depositedUsdt > 0 && (
                                  <div className="bg-white dark:bg-background rounded-lg px-4 py-2 inline-flex items-center gap-2.5 border border-border/5">
                                    <Image src={usdtIcon} alt="USDT" width={22} height={22} className="opacity-90" />
                                    <span className="font-medium text-card-foreground">{path.depositedUsdt} USDT</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.05,
                        type: 'spring',
                        stiffness: 100,
                        damping: 15,
                      }}
                      className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-background rounded-xl border border-border/5"
                    >
                      <Image
                        width={100}
                        height={100}
                        alt="No Trust Paths Yet"
                        src={path.src}
                        className="mx-auto mb-6 h-14 rounded-xl"
                      />
                      <h3 className="text-xl font-medium text-card-foreground mb-2">No Trust Paths Yet</h3>
                      <p className="text-muted-foreground mb-8">Start connecting with your network here.</p>
                      <Button
                        className="bg-accent text-accent-foreground font-medium
                          hover:bg-accent/90 transition-all duration-200"
                      >
                        Create New Path <PlusIcon className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent
                  value="deposits"
                  className="p-4 mt-0 min-h-[350px] bg-foreground border-none rounded-b-xl flex-1"
                >
                  {isLoadingTransactions || isLoadingReceivedTransactions ? (
                    <div className="py-8 flex justify-center h-full">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                    </div>
                  ) : allTransactions?.length ? (
                    <div className="space-y-4 p-1">
                      {allTransactions
                        .filter((tx) => {
                          const depositState = tx.depositRecord?.state
                          const isReceiver = tx.destinationAddress === publicKey?.toString()
                          const isSender = tx.userId === session?.user.id

                          return depositState === 'PENDING' && (isSender || isReceiver)
                        })
                        .map((tx, idx) => {
                          const isSender = tx.userId === session?.user.id
                          const isReceiver = tx.destinationAddress === publicKey?.toString()
                          const ageHours = getTransactionAge(tx.createdAt)
                          const signatures = parseTransactionSignatures(tx.depositRecord?.signatures || [])

                          return (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: idx * 0.05,
                                type: 'spring',
                                stiffness: 100,
                                damping: 15,
                              }}
                              className="relative flex items-start gap-4 p-4 bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer focus-within:ring-2 ring-offset-2 ring-secondary"
                              onClick={() => handleOpenTransactionDetails(tx)}
                            >
                              <div className="absolute left-6 top-0 bottom-0 w-px " />

                              <Avatar className="relative z-10 flex-shrink-0  rounded-full flex items-center justify-center">
                                <AvatarImage src={tx.depositRecord?.stable === 'usdc' ? usdcIcon.src : usdtIcon.src} />
                              </Avatar>

                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-semibold text-card-foreground">
                                    {isSender
                                      ? `To: ${tx.destinationUser?.email || '—'}`
                                      : `From: ${tx.user?.email || '—'}`}
                                  </h4>
                                  <span
                                    className={cn(
                                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                      getStatusBadgeStyles(tx.depositRecord?.state as TransactionStatus),
                                    )}
                                  >
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    {tx.depositRecord?.state.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-muted-foreground text-xs mt-1">{ageHours}h ago</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {tx.depositRecord?.policy && (
                                    <SignatureBadges
                                      policy={tx.depositRecord.policy as SignatureType}
                                      signatures={signatures}
                                      isSender={isSender}
                                      isReceiver={isReceiver}
                                    />
                                  )}
                                </div>

                                <div className="mt-4 flex justify-between items-center">
                                  <span className="font-semibold text-card-foreground">
                                    {tx.amount} {tx.depositRecord?.stable?.toUpperCase()}
                                  </span>
                                  {isSender &&
                                    tx.depositRecord?.policy !== 'RECEIVER' &&
                                    !signatures.some((sig) => sig.role === 'SENDER') && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="hover:scale-105 transition-transform"
                                        disabled={signingTransactionId === tx.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          console.log('Sign as Sender clicked with:', {
                                            transaction: tx,
                                            sessionUser: session?.user,
                                            fullSession: session,
                                          })
                                          const transactionDetails: TransactionDetailsData = {
                                            id: tx.depositRecord?.id || '',
                                            amount: tx.amount,
                                            token: tx.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
                                            recipientEmail: tx.destinationUserId
                                              ? (tx.destinationUser?.email as string)
                                              : '',
                                            senderEmail: tx.user?.email || '',
                                            createdAt: new Date(tx.createdAt),
                                            status:
                                              tx.depositRecord?.state === 'COMPLETED'
                                                ? ('COMPLETED' as TransactionStatus)
                                                : tx.depositRecord?.state === 'CANCELLED'
                                                  ? ('CANCELLED' as TransactionStatus)
                                                  : tx.status,
                                            authorization: tx.depositRecord?.policy as SignatureType,
                                            isDepositor: tx.userId === session?.user.id,
                                            signatures,
                                            statusHistory: [
                                              {
                                                status: tx.depositRecord?.state as string,
                                                timestamp: new Date(tx.createdAt),
                                                actor: tx.userId,
                                              },
                                            ],
                                            depositIndex: tx.depositRecord?.depositIndex || 0,
                                            transactionSignature: tx.signature,
                                            senderPublicKey: tx.walletPublicKey,
                                            receiverPublicKey: tx.destinationAddress || '',
                                            depositRecord: tx.depositRecord,
                                          }
                                          setSelectedTransaction(transactionDetails)
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
                                        {signingTransactionId === tx.id ? (
                                          <>
                                            <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                            Signing...
                                          </>
                                        ) : (
                                          'Sign as Sender'
                                        )}
                                      </Button>
                                    )}
                                  {isReceiver &&
                                    tx.depositRecord?.policy !== 'SENDER' &&
                                    !signatures.some((sig) => sig.role === 'RECEIVER') && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="hover:scale-105 transition-transform"
                                        disabled={signingTransactionId === tx.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          console.log('Sign as Receiver clicked with:', {
                                            transaction: tx,
                                            sessionUser: session?.user,
                                            fullSession: session,
                                          })
                                          const transactionDetails: TransactionDetailsData = {
                                            id: tx.depositRecord?.id || '',
                                            amount: tx.amount,
                                            token: tx.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
                                            recipientEmail: tx.destinationUserId
                                              ? (tx.destinationUser?.email as string)
                                              : '',
                                            senderEmail: tx.user?.email || '',
                                            createdAt: new Date(tx.createdAt),
                                            status:
                                              tx.depositRecord?.state === 'COMPLETED'
                                                ? ('COMPLETED' as TransactionStatus)
                                                : tx.depositRecord?.state === 'CANCELLED'
                                                  ? ('CANCELLED' as TransactionStatus)
                                                  : tx.status,
                                            authorization: tx.depositRecord?.policy as SignatureType,
                                            isDepositor: tx.userId === session?.user.id,
                                            signatures,
                                            statusHistory: [
                                              {
                                                status: tx.depositRecord?.state as string,
                                                timestamp: new Date(tx.createdAt),
                                                actor: tx.userId,
                                              },
                                            ],
                                            depositIndex: tx.depositRecord?.depositIndex || 0,
                                            transactionSignature: tx.signature,
                                            senderPublicKey: tx.walletPublicKey,
                                            receiverPublicKey: tx.destinationAddress || '',
                                            depositRecord: tx.depositRecord,
                                          }
                                          setSelectedTransaction(transactionDetails)
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
                                        {signingTransactionId === tx.id ? (
                                          <>
                                            <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                            Signing...
                                          </>
                                        ) : (
                                          'Sign as Receiver'
                                        )}
                                      </Button>
                                    )}
                                  {((isSender && signatures.some((sig) => sig.role === 'SENDER')) ||
                                    (isReceiver && signatures.some((sig) => sig.role === 'RECEIVER'))) &&
                                    tx.depositRecord?.state === 'PENDING' && (
                                      <span className="text-muted-foreground text-xs ml-2">
                                        Waiting for counterparty...
                                      </span>
                                    )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <h3 className="text-xl font-medium text-slate-700 mb-2">
                        You don&apos;t have any active deposits!
                      </h3>
                      <p className="text-slate-500 mb-6">Start by buying or depositing funds:</p>
                      <Button
                        className="bg-accent text-accent-foreground font-semibold hover:font-bold hover:bg-accent/90 cursor-pointer"
                        onClick={handleOpenDepositModal}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Funds
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="history"
                  className="p-4 mt-0 min-h-[350px] bg-foreground border-none rounded-b-xl flex-1"
                >
                  {isLoadingTransactions || isLoadingReceivedTransactions ? (
                    <div className="py-8 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                    </div>
                  ) : allTransactions?.length > 0 ? (
                    <div className="space-y-3 p-1 h-full">
                      {(() => {
                        const filteredTransactions = allTransactions.filter((tx) => {
                          const depositState = tx.depositRecord?.state
                          console.log('Transaction state:', tx.id, depositState)
                          return depositState === 'COMPLETED' || depositState === 'CANCELLED'
                        })

                        if (filteredTransactions.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-xl">
                              <h3 className="text-card-foreground text-lg font-medium">
                                No completed transactions yet!
                              </h3>
                              <p className="text-muted-foreground">
                                Your completed transactions will appear here once they&apos;re done.
                              </p>
                            </div>
                          )
                        }

                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: 0.05,
                              type: 'spring',
                              stiffness: 100,
                              damping: 15,
                            }}
                          >
                            {filteredTransactions.map((tx) => {
                              const isSender = tx.userId === session?.user.id
                              const completedDate = tx.completedAt ? new Date(tx.completedAt) : new Date(tx.updatedAt)
                              const formattedDate = completedDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })

                              return (
                                <div
                                  key={tx.id}
                                  className="relative flex items-start gap-4 p-4 bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-lg shadow hover:shadow-md transition-all duration-200 cursor-pointer mb-3"
                                  onClick={() => handleOpenTransactionDetails(tx)}
                                >
                                  <Avatar className="relative z-10 flex-shrink-0 rounded-full flex items-center justify-center">
                                    <AvatarImage
                                      src={tx.depositRecord?.stable === 'usdc' ? usdcIcon.src : usdtIcon.src}
                                    />
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                        <h4 className="font-semibold text-card-foreground">
                                          {isSender ? 'Sent to:' : 'Received from:'}{' '}
                                          {isSender ? tx.destinationUser?.email : tx.user?.email || '—'}
                                        </h4>
                                        <span className="text-sm text-muted-foreground">{formattedDate}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-card-foreground">
                                          {isSender ? '-' : '+'}
                                          {tx.amount}
                                          <span className="text-muted-foreground ml-1">
                                            {tx.depositRecord?.stable?.toUpperCase()}
                                          </span>
                                        </span>
                                        <span
                                          className={cn(
                                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                            getStatusBadgeStyles(tx.depositRecord?.state as TransactionStatus),
                                          )}
                                        >
                                          {tx.depositRecord?.state.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>

                                    {tx.depositRecord?.policy && (
                                      <div className="mt-2">
                                        {(() => {
                                          const {
                                            icon: PolicyIcon,
                                            description,
                                            className,
                                          } = getPolicyDetails(tx.depositRecord.policy, true)
                                          return (
                                            <div
                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
                                            >
                                              <PolicyIcon className="w-3.5 h-3.5 mr-1.5" />
                                              {description}
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </motion.div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-xl">
                      <h3 className="text-card-foreground text-lg font-medium">No transaction history yet!</h3>
                      <p className="text-muted-foreground">Start your first transaction to see it here.</p>
                      <Button
                        className="bg-accent text-accent-foreground font-semibold hover:font-bold hover:bg-accent/90 cursor-pointer"
                        onClick={handleOpenDepositModal}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Start Transaction
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </Card>
      </main>

      {selectedTransaction && (
        <TransactionDetails
          isOpen={isTransactionDetailsOpen}
          onClose={() => setIsTransactionDetailsOpen(false)}
          transaction={selectedTransaction}
        />
      )}

      {/* Transaction Success Modal */}
      <TransactionSuccessModal
        isOpen={successModalState.isOpen}
        onClose={() => setSuccessModalState((prev) => ({ ...prev, isOpen: false }))}
        status={successModalState.status}
        transactionSignature={successModalState.signature}
        message={successModalState.message}
        amount={successModalState.amount}
        token={successModalState.token}
        recipient={successModalState.recipient}
        depositId={successModalState.depositId}
      />
    </div>
  )
}
