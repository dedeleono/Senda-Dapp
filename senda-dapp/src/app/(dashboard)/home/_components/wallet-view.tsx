'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUp, PlusIcon, Wallet, ArrowDown, ClockIcon, ShieldCheckIcon, UsersIcon, UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import path from '@/public/2.svg'
import IceDoodle from '@/public/IceCreamDoodle.svg'
import Image from 'next/image'
import WalletQRDialog, { WalletQRDialogRef } from './wallet-qr-dialog'
import { useWalletBalances } from '@/hooks/use-wallet-balances'
import { TransactionStatus, TransactionType, SignatureType } from '@prisma/client'
import { ScrollArea } from '@/components/ui/scroll-area'

import usdcIcon from '@/public/usdc.svg'
import usdtIcon from '@/public/usdt-round.svg'
import DepositModal, { DepositModalRef } from '@/components/deposit/deposit-modal'
import TransactionDetails from '@/components/transactions/transaction-details'
import { Badge } from '@/components/ui/badge'
import { useWalletStore } from '@/stores/use-wallet-store'
import WithdrawModal, { WithdrawModalRef } from '@/components/withdraw/withdraw-modal'
import AddFundsModal, { AddFundsModalRef } from '@/components/deposit/add-funds-modal'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparklines } from 'react-sparklines'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface TransactionDetailsData {
  id: string
  amount: number
  token: 'USDC' | 'USDT'
  recipientEmail: string
  createdAt: Date
  status: TransactionStatus
  authorization: SignatureType
  isDepositor: boolean
  signatures: Array<{
    signer: string
    role: SignatureType
    timestamp?: Date
    status: 'signed' | 'pending'
  }>
  statusHistory: Array<{
    status: string
    timestamp: Date
    actor?: string
  }>
  depositIndex: number
  transactionSignature?: string
  senderPublicKey: string
  receiverPublicKey: string
}

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
  }
  destinationUserId?: string
  destinationUser?: {
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

  const { data: transactions, isLoading: isLoadingTransactions } = trpc.transactionRouter.getUserTransactions.useQuery(
    { limit: 10 },
    {
      enabled: isAuthenticated,
      retry: false,
    }
  ) as { data: TransactionResponse | undefined, isLoading: boolean }

  const { data: paths, isLoading: isLoadingPaths } = trpc.userRouter.getUserPaths.useQuery(
    { userId: session?.user.id as string },
    {
      enabled: isAuthenticated,
      retry: false,
    }
  ) as { data: PathsResponse | undefined, isLoading: boolean }

  console.log('Auth status:', isAuthenticated)
  console.log('Session:', session?.user.id)
  console.log('Public key:', publicKey?.toString())
  console.log('Paths query response:', paths)

  console.log('Current transactions state:', {
    isLoading: isLoadingTransactions,
    hasData: !!transactions,
    transactionCount: transactions?.transactions?.length || 0,
    transactions: transactions?.transactions
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
    
    let message = ''
    if (recipientRole === 'GUEST') {
      message = 'Deposit completed. An invitation has been sent to the recipient to claim the funds.'
    } else if (recipientRole === 'INDIVIDUAL') {
      message = 'Deposit completed. The recipient has been notified.'
    } else {
      message = 'Deposit completed successfully.'
    }
    
  }

  const handleOpenTransactionDetails = (transaction: Transaction) => {
    console.log('Opening transaction details for:', transaction)
    const depositIndex = transaction.depositRecord?.depositIndex;
    if (typeof depositIndex !== 'number') {
      console.error('Invalid deposit index:', depositIndex);
      return;
    }

    const senderPublicKey = transaction.walletPublicKey;
    const receiverPublicKey = transaction.destinationAddress;
    
    if (!senderPublicKey || !receiverPublicKey) {
      console.error('Missing required public keys:', { senderPublicKey, receiverPublicKey });
      return;
    }

    console.log('Transaction deposit record:', transaction.depositRecord)

    const transactionDetails: TransactionDetailsData = {
      id: transaction.depositRecord?.id || '',
      amount: transaction.amount,
      token: transaction.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
      recipientEmail: transaction.destinationUserId ? transaction.destinationUser?.email as string : '',
      createdAt: new Date(transaction.createdAt),
      status: transaction.depositRecord?.state === 'COMPLETED' ? 'COMPLETED' as TransactionStatus :
             transaction.depositRecord?.state === 'CANCELLED' ? 'CANCELLED' as TransactionStatus :
             transaction.status,
      authorization: transaction.depositRecord?.policy as SignatureType,
      isDepositor: transaction.userId === session?.user.id,
      signatures: transaction.depositRecord?.signatures?.map((sig: any) => {
        try {
          const parsedSig = typeof sig === 'string' ? JSON.parse(sig) : sig;
          return {
            ...parsedSig,
            role: parsedSig.role.toUpperCase() as SignatureType
          };
        } catch (e) {
          console.error('Error parsing signature:', e);
          return null;
        }
      }).filter(Boolean) || [],
      statusHistory: [
        {
          status: transaction.depositRecord?.state as string,
          timestamp: new Date(transaction.createdAt),
          actor: transaction.userId
        }
      ],
      depositIndex,
      transactionSignature: transaction.signature,
      senderPublicKey,
      receiverPublicKey
    };

    console.log('Setting transaction details:', transactionDetails)
    setSelectedTransaction(transactionDetails);
    setIsTransactionDetailsOpen(true);
  };

  const { mutate: updateSignature } = trpc.sendaRouter.updateDepositSignature.useMutation({
    onSuccess: (data) => {
      console.log('Signature update mutation succeeded:', data)
      toast.success('Transaction signed successfully')
      utils.transactionRouter.getUserTransactions.invalidate()
    },
    onError: (error) => {
      console.error('Signature update mutation failed:', error)
      toast.error(error.message || 'Failed to sign transaction')
    }
  })

  const handleSignatureComplete = async () => {
    console.log('handleSignatureComplete called with:', {
      selectedTransaction,
      sessionUser: session?.user,
      fullSession: session
    })

    if (!selectedTransaction?.id || !session?.user?.id) {
      console.error('Missing required data:', {
        transactionId: selectedTransaction?.id,
        userId: session?.user?.id
      })
      toast.error('Missing required data for signature')
      return
    }

    // Find the transaction in the transactions list
    const transaction = transactions?.transactions.find(tx => 
      tx.depositRecord?.id === selectedTransaction.id
    );

    if (!transaction) {
      console.error('Could not find transaction:', selectedTransaction.id);
      toast.error('Could not find transaction');
      return;
    }

    console.log('Calling updateSignature with:', {
      depositId: selectedTransaction.id,
      role: 'sender',
      signerId: transaction.userId, // Use the transaction's userId
      userDetails: {
        id: session.user.id,
        email: session.user.email,
        walletPublicKey: session.user.sendaWalletPublicKey
      }
    })

    toast.loading('Signing transaction...')
    updateSignature({
      depositId: selectedTransaction.id,
      role: 'sender',
      signerId: transaction.userId // Use the transaction's userId
    })
  }

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
          className: 'text-[#596f62] dark:text-[#d7dfbe] bg-[#596f62]/20 dark:bg-[#1c3144]/20',
        }
      case 'RECEIVER':
        return {
          icon: UserIcon,
          label: 'Single Signature',
          description: !history ? 'Requires receiver signature' : 'Signed by receiver',
          className: 'text-[#596f62] dark:text-[#d7dfbe] bg-[#596f62]/20 dark:bg-[#1c3144]/20',
        }
      case 'DUAL':
        return {
          icon: UsersIcon,
          label: 'Multi-Signature',
          description: !history ? 'Requires multiple signatures' : 'Signed by both',
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

  return (
    <div className="flex flex-col h-full min-h-full mx-auto md:flex-row md:max-w-4xl">
      <main className="flex-1 p-6 space-y-6 md:min-w-4xl">
        <Card className="bg-card p-8 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-3">
              {/* Total Balance */}
              <h2 className="md:text-4xl text-3xl font-bold text-card-foreground text-nowrap">
                ${totalBalance.toFixed(0)}
                <small className="text-muted-foreground text-xs ml-1">USD</small>
              </h2>

              <div className="flex gap-1 md:gap-2 items-center -ml-2 md:-ml-3">
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

            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 relative">
              <Image src={IceDoodle.src} alt="You've got this!" fill className="object-contain" />
            </div>
          </div>

          <div className="md:mt-3 mt-7 grid md:grid-cols-4 grid-cols-1 md:gap-2 gap-3 md:w-5/6">
            <Button
              onClick={handleOpenDepositModal}
              variant="default"
              className="bg-secondary text-secondary-foreground font-semibold md:h-auto h-12 hover:!scale-103 hover:!bg-secondary/90 dark:hover:!bg-secondary/80 hover:!font-bold transition-all duration-300 cursor-pointer"
            >
              Send <ArrowUp className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleOpenAddFundsModal}
              variant="default"
              className="bg-accent text-accent-foreground hover:!bg-accent/90 dark:hover:!bg-accent/80 hover:!font-bold hover:!scale-103 font-semibold w-full transition-all duration-300 cursor-pointer md:h-auto h-12"
            >
              Add Funds <PlusIcon className="h-4 w-4" />
            </Button>

            <Button
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
                  value="paths"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-secondary data-[state=active]:shadow-none rounded-none rounded-tl-lg data-[state=active]:text-card-foreground data-[state=active]:font-bold"
                >
                  My Paths
                </TabsTrigger>

                <TabsTrigger
                  value="deposits"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-secondary data-[state=active]:shadow-none rounded-none data-[state=active]:text-card-foreground data-[state=active]:font-bold"
                >
                  Active deposits
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-secondary data-[state=active]:shadow-none rounded-none rounded-tr-lg data-[state=active]:text-card-foreground data-[state=active]:font-bold"
                >
                  Activity History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="h-[350px]">
              <ScrollArea className="h-full">
                <TabsContent value="paths" className="p-4 mt-0 h-full bg-foreground border-none rounded-b-xl">
                  {isLoadingPaths ? (
                    <div className="py-12 flex justify-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-secondary border-t-transparent drop-shadow-lg" />
                    </div>
                  ) : paths && paths.paths.length > 0 ? (
                    <div className="space-y-5">
                      {paths.paths.map((path, i) => {
                        const isSender = path.senderPublicKey === publicKey?.toString()
                        const other = isSender ? path.receiver : path.sender

                        return (
                          <motion.div
                            key={path.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: i * 0.1,
                              type: "spring",
                              damping: 20
                            }}
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
                                  <Badge variant="outline" className="bg-white dark:bg-background text-accent-foreground border-accent/20 px-3">
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
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-background rounded-xl border border-border/5"
                    >
                      <img src={path.src} className="mx-auto mb-6 h-14 rounded-xl" />
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

                <TabsContent value="deposits" className="p-4 mt-0 h-full bg-foreground border-none rounded-b-xl">
                  {isLoadingTransactions ? (
                    <div className="py-8 flex justify-center h-full">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7dfbe] border-t-transparent" />
                    </div>
                  ) : transactions?.transactions?.length ? (
                    <div className="space-y-4 p-1">
                      {transactions.transactions
                        .filter((tx) => {
                          // Only show deposits that are in pendingWithdrawal state
                          const depositState = tx.depositRecord?.state;
                          return depositState === 'PENDING' //@todo properly sync database states and statuses
                        })
                        .map((tx, idx) => {
                          const isSender = tx.userId === session?.user.id
                          const ageHours = Math.floor((Date.now() - new Date(tx.createdAt).getTime()) / 3600000)

                          return (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="relative flex items-start gap-4 p-4 bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer focus-within:ring-2 ring-offset-2 ring-[#d7dfbe]"
                              onClick={() => handleOpenTransactionDetails(tx)}
                            >
                              <div className="absolute left-6 top-0 bottom-0 w-px " />

                              <Avatar className="relative z-10 flex-shrink-0  rounded-full flex items-center justify-center">
                                <AvatarImage src={tx.depositRecord?.stable === 'usdc' ? usdcIcon.src : usdtIcon.src} />
                              </Avatar>

                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-semibold text-gray-900">
                                    To: {tx.destinationUser?.email || '—'}
                                  </h4>
                                  <span
                                    className={`
                      inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full
                      ${
                        tx.depositRecord?.state === TransactionStatus.PENDING
                          ? 'text-yellow-800 bg-yellow-100'
                          : 'text-green-800 bg-green-100'
                      }
                    `}
                                  >
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    {tx.depositRecord?.state.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-gray-500 text-xs mt-1">{ageHours}h ago</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {tx.depositRecord?.policy &&
                                    (() => {
                                      const {
                                        icon: PolicyIcon,
                                        label,
                                        className,
                                        description,
                                      } = getPolicyDetails(tx.depositRecord.policy)
                                      return (
                                        <div
                                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
                                        >
                                          <PolicyIcon className="w-3.5 h-3.5 mr-1.5" />
                                          {description}
                                        </div>
                                      )
                                    })()}
                                </div>

                                <div className="mt-4 flex justify-between items-center">
                                  <span className="font-semibold text-gray-800">
                                    {tx.amount} {tx.depositRecord?.stable?.toUpperCase()}
                                  </span>
                                  {isSender && tx.depositRecord?.policy !== 'RECEIVER' && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="hover:scale-105 transition-transform"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        console.log('Sign as Sender clicked with:', {
                                          transaction: tx,
                                          sessionUser: session?.user,
                                          fullSession: session
                                        })
                                        const transactionDetails: TransactionDetailsData = {
                                          id: tx.depositRecord?.id || '',
                                          amount: tx.amount,
                                          token: tx.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
                                          recipientEmail: tx.destinationUserId ? tx.destinationUser?.email as string : '',
                                          createdAt: new Date(tx.createdAt),
                                          status: tx.depositRecord?.state === 'COMPLETED' ? 'COMPLETED' as TransactionStatus :
                                                 tx.depositRecord?.state === 'CANCELLED' ? 'CANCELLED' as TransactionStatus :
                                                 tx.status,
                                          authorization: tx.depositRecord?.policy as SignatureType,
                                          isDepositor: tx.userId === session?.user.id,
                                          signatures: tx.depositRecord?.signatures?.map((sig: any) => {
                                            try {
                                              const parsedSig = typeof sig === 'string' ? JSON.parse(sig) : sig;
                                              return {
                                                ...parsedSig,
                                                role: parsedSig.role.toUpperCase() as SignatureType
                                              };
                                            } catch (e) {
                                              console.error('Error parsing signature:', e);
                                              return null;
                                            }
                                          }).filter(Boolean) || [],
                                          statusHistory: [
                                            {
                                              status: tx.depositRecord?.state as string,
                                              timestamp: new Date(tx.createdAt),
                                              actor: tx.userId
                                            }
                                          ],
                                          depositIndex: tx.depositRecord?.depositIndex || 0,
                                          transactionSignature: tx.signature,
                                          senderPublicKey: tx.walletPublicKey,
                                          receiverPublicKey: tx.destinationAddress || ''
                                        }
                                        console.log('Setting transaction details and calling updateSignature:', {
                                          transactionDetails,
                                          depositId: tx.depositRecord?.id,
                                          signerId: tx.userId,
                                          userDetails: {
                                            id: session.user.id,
                                            email: session.user.email,
                                            walletPublicKey: session.user.sendaWalletPublicKey
                                          }
                                        })
                                        setSelectedTransaction(transactionDetails)
                                        updateSignature({
                                          depositId: tx.depositRecord?.id || '',
                                          role: 'sender',
                                          signerId: tx.userId
                                        })
                                      }}
                                    >
                                      Sign as Sender
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <h3 className="text-xl font-medium text-slate-700 mb-2">You don't have any active deposits!</h3>
                      <p className="text-slate-500 mb-6">Start by buying or depositing funds:</p>
                      <Button
                        className="bg-[#f6ead7] text-black font-semibold hover:font-bold hover:bg-[#f6ead7] cursor-pointer"
                        onClick={handleOpenDepositModal}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Funds
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="p-4 mt-0 min-h-[350px] h-full bg-foreground border-none rounded-b-xl">
                  {isLoadingTransactions ? (
                    <div className="py-8 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                    </div>
                  ) : transactions?.transactions && transactions.transactions.length > 0 ? (
                    <div className="space-y-3 p-1 h-full">
                      {(() => {
                        const filteredTransactions = transactions.transactions.filter(
                          (tx) => {
                            // Show only complete or cancelled deposits
                            const depositState = tx.depositRecord?.state;
                            console.log("Transaction state:", tx.id, depositState);
                            return depositState === 'COMPLETED' || depositState === 'CANCELLED';
                          }
                        )
                        
                        if (filteredTransactions.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-xl">
                              <h3 className="text-card-foreground text-lg font-medium">
                                No completed transactions yet!
                              </h3>
                              <p className="text-muted-foreground">
                                Your completed transactions will appear here once they're done.
                              </p>
                            </div>
                          )
                        }

                        return filteredTransactions.map((tx, idx) => {
                          const isSender = tx.userId === session?.user.id
                          const completedDate = tx.completedAt ? new Date(tx.completedAt) : new Date(tx.updatedAt)
                          const formattedDate = completedDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })

                          return (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="relative flex items-start gap-4 p-4 bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-lg shadow hover:shadow-md transition-all duration-200 cursor-pointer"
                              onClick={() => handleOpenTransactionDetails(tx)}
                            >
                              <Avatar className="relative z-10 flex-shrink-0 rounded-full flex items-center justify-center">
                                <AvatarImage src={tx.depositRecord?.stable === 'usdc' ? usdcIcon.src : usdtIcon.src} />
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <h4 className="font-semibold text-card-foreground">
                                      {isSender ? 'Sent to:' : 'Received from:'} {tx.destinationUser?.email || '—'}
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
                                      className={`
                                        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                        ${
                                          tx.depositRecord?.state === TransactionStatus.COMPLETED ? 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/30' : tx.depositRecord?.state === TransactionStatus.CANCELLED ? 'text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/30'
                                            : 'text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/50'
                                        }
                                      `}
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
                            </motion.div>
                          )
                        })
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-background dark:bg-background/20 dark:border dark:border-background/20 rounded-xl">
                      <h3 className="text-card-foreground text-lg font-medium">No transaction history yet!</h3>
                      <p className="text-muted-foreground">Start your first transaction to see it here.</p>
                      <Button
                        className="bg-accent text-accent-foreground font-semibold hover:font-bold hover:bg-accent/90 dark:hover:bg-accent/80 hover:scale-105 transition-all duration-200 cursor-pointer mt-6"
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
    </div>
  )
}