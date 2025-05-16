'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUp, PlusIcon, Wallet, ArrowDown, ClockIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import path from '@/public/2.svg'
import IceDoodle from '@/public/IceCreamDoodle.svg'
import Image from 'next/image'
import WalletQRDialog, { WalletQRDialogRef } from './wallet-qr-dialog'
import { useWalletBalances } from '@/hooks/use-wallet-balances'
import { TransactionStatus, TransactionType, SignatureType } from '@prisma/client'

import usdcIcon from '@/public/usdc.svg'
import usdtIcon from '@/public/usdt-round.svg'
import DepositModal, { DepositModalRef } from '@/components/deposit/deposit-modal'
import TransactionCard from '@/components/transactions/transaction-card'
import TransactionDetails from '@/components/transactions/transaction-details'
import { Badge } from '@/components/ui/badge'
import { useWalletStore } from '@/stores/use-wallet-store'
import WithdrawModal, { WithdrawModalRef } from '@/components/withdraw/withdraw-modal'
import AddFundsModal, { AddFundsModalRef } from '@/components/deposit/add-funds-modal'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparklines } from 'react-sparklines'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
  }
  receiver: {
    email: string
    name: string | null
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

    const escrowId = transaction.depositRecord?.escrowId;
    if (!escrowId) {
      console.error('Missing escrow ID');
      return;
    }

    const transactionDetails: TransactionDetailsData = {
      id: escrowId,
      amount: transaction.amount,
      token: transaction.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT',
      recipientEmail: transaction.destinationUserId ? transaction.destinationUser?.email as string : '',
      createdAt: new Date(transaction.createdAt),
      status: transaction.status,
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
          status: transaction.status,
          timestamp: new Date(transaction.createdAt),
          actor: transaction.userId
        }
      ],
      depositIndex,
      transactionSignature: transaction.signature,
      senderPublicKey,
      receiverPublicKey
    };

    setSelectedTransaction(transactionDetails);
    setIsTransactionDetailsOpen(true);
  };

  const handleSignatureComplete = () => {
    utils.transactionRouter.getUserTransactions.invalidate()
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

  return (
    <div className="flex flex-col h-full min-h-full mx-auto md:flex-row md:max-w-4xl">
      <main className="flex-1 p-6 space-y-6 md:min-w-4xl">
        <Card className="bg-white p-8 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-3">
              {/* Total Balance */}
              <h2 className="md:text-4xl text-3xl font-bold text-black text-nowrap">
                ${totalBalance.toFixed(0)}
                <small className="text-gray-500 text-xs ml-1">USD</small>
              </h2>

              <div className="flex gap-2 items-center -ml-3">
                {balances.map((token) => (
                  <div key={token.mint} className="items-center md:flex hidden">
                    <div className="w-auto rounded-full mr-1 flex items-center justify-center">
                      <Image
                        src={token.symbol === 'USDC' ? usdcIcon : usdtIcon}
                        alt={token.symbol}
                        width={100}
                        height={100}
                        className={` ${token.symbol === 'USDC' ? 'md:w-[56px] md:h-[56px] w-9 h-9' : 'md:w-7 md:h-7 '}`}
                      />
                    </div>
                    <span className={`text-gray-700 ${token.symbol === 'USDC' ? '-ml-3.5' : 'text-gray-500'}`}>
                      <span className="font-medium text-lg">
                        {token.uiBalance.toFixed(0)}
                        <small className="text-gray-500 text-[10px] ml-1">{token.symbol}</small>
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
              className="bg-[#d7dfbe] text-black font-semibold md:h-auto h-12 hover:!scale-103 hover:!bg-[#d7dfbe] hover:!font-bold transition-all duration-300 cursor-pointer"
            >
              Send <ArrowUp className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleOpenAddFundsModal}
              variant="default"
              className="bg-[#f6ead7] text-black hover:!bg-[#f6ead7] hover:!font-bold hover:!scale-103 font-semibold w-full transition-all duration-300 cursor-pointer md:h-auto h-12"
            >
              Add Funds <PlusIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="border border-[#d7dfbe] text-black font-semibold hover:!bg-transparent hover:!scale-103 hover:!text-black hover:!border-[#d7dfbe] transition-all duration-300 cursor-pointer md:h-auto h-12"
              onClick={handleOpenWithdrawModal}
            >
              Withdraw <ArrowDown className="h-4 w-4" />
            </Button>

            {/* <Button
              variant="ghost"
              className="border border-[#d7dfbe] text-black font-semibold hover:!bg-transparent hover:!scale-103 hover:!text-black hover:!border-[#d7dfbe] transition-all duration-300 cursor-pointer md:h-auto h-12"
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

        <Card className="bg-white rounded-2xl shadow-md">
          <Tabs defaultValue="deposits" className="p-0">
            <div className="overflow-x-auto">
              <TabsList className="w-full grid grid-cols-3 bg-transparent border-b-2 border-gray-400/5 p-0 rounded-none h-auto">
                <TabsTrigger
                  value="paths"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-[#d7dfbe] data-[state=active]:shadow-none rounded-none rounded-tl-lg data-[state=active]:text-foreground data-[state=active]:font-bold"
                >
                  My Paths
                </TabsTrigger>

                <TabsTrigger
                  value="deposits"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-[#d7dfbe] data-[state=active]:shadow-none rounded-none data-[state=active]:text-foreground data-[state=active]:font-bold"
                >
                  Active deposits
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="py-4 px-6 data-[state=active]:border-b-3 data-[state=active]:border-[#d7dfbe] data-[state=active]:shadow-none rounded-none rounded-tr-lg data-[state=active]:text-foreground data-[state=active]:font-bold"
                >
                  Activity History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="paths" className="p-0 mt-0">
              {isLoadingPaths ? (
                <div className="py-8 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7dfbe] border-t-transparent" />
                </div>
              ) : paths && paths.paths.length > 0 ? (
                <div className="p-6 space-y-6">
                  {paths.paths.map((path, i) => {
                    const isSender = path.senderPublicKey === publicKey?.toString()
                    const other = isSender ? path.receiver : path.sender

                    return (
                      <motion.div
                        key={path.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative bg-white/90 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-shadow border border-gray-100"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* YOU */}
                          <div className="flex-1">
                            <div className="flex items-center justify-end gap-3">
                              <div className="text-sm">
                                <p className="font-semibold text-gray-900">You</p>
                                <p className="truncate max-w-[140px] text-gray-500">{publicKey?.toString()}</p>
                              </div>
                              <div className="h-12 w-12 bg-gradient-to-br from-green-200 to-green-100 rounded-full flex items-center justify-center">
                                {/* avatar icon */}
                                <svg /* … */ />
                              </div>
                            </div>
                          </div>

                          {/* FLOW LINE + COUNT + SPARKLINE */}
                          <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="h-[2px] w-12 bg-gradient-to-r from-green-300 to-yellow-200 animate-[flow_1.5s_linear_infinite]" />
                              <div className="relative bg-yellow-50 rounded-full px-3 py-1 text-xs font-medium">
                                {path.depositCount} deposits
                              </div>
                              <div className="h-[2px] w-12 bg-gradient-to-r from-yellow-200 to-green-300 animate-[flow_1.5s_linear_infinite]" />
                            </div>
                            <Sparklines limit={5} width={80} height={20} margin={0} />
                          </div>

                          {/* OTHER PARTY */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-full flex items-center justify-center">
                                {/* avatar icon */}
                                <svg /* … */ />
                              </div>
                              <div className="text-sm">
                                <p className="font-semibold text-gray-900">{other.email}</p>
                                <p className="truncate max-w-[140px] text-gray-500">
                                  {isSender ? path.receiverPublicKey : path.senderPublicKey}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BALANCES */}
                        <div className="mt-4 flex justify-center gap-4 text-sm">
                          {path.depositedUsdc > 0 && (
                            <div className="bg-gray-50 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                              <Image src={usdcIcon} alt="USDC" width={20} height={20} />
                              <span className="font-medium">{path.depositedUsdc} USDC</span>
                            </div>
                          )}
                          {path.depositedUsdt > 0 && (
                            <div className="bg-gray-50 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                              <Image src={usdtIcon} alt="USDT" width={20} height={20} />
                              <span className="font-medium">{path.depositedUsdt} USDT</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <img src={path.src} className="mx-auto mb-6 h-12 rounded-lg" />
                  <h3 className="text-gray-900 text-lg font-medium">You have no trust paths yet!</h3>
                  <p className="text-gray-500">Start connecting with your people here.</p>
                  <Button className="bg-[#f6ead7] text-black font-semibold hover:font-bold hover:bg-[#f6ead7] cursor-pointer mt-6">
                    Add New Persona <PlusIcon />
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deposits" className="p-4 mt-0">
              {isLoadingTransactions ? (
                <div className="py-8 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7dfbe] border-t-transparent" />
                </div>
              ) : transactions?.transactions?.length ? (
                <div className="space-y-3">
                  {transactions.transactions
                    .filter((tx) => tx.status === TransactionStatus.PENDING)
                    .map((tx, idx) => {
                      const isSender = tx.userId === session?.user.id
                      const ageHours = Math.floor((Date.now() - new Date(tx.createdAt).getTime()) / 3600000)

                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative flex items-start gap-4 p-4 bg-foreground rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer focus-within:ring-2 ring-offset-2 ring-[#d7dfbe]"
                          onClick={() => handleOpenTransactionDetails(tx)}
                        >
                          {/* vertical timeline line */}
                          <div className="absolute left-6 top-0 bottom-0 w-px " />

                          {/* dot icon */}
                          
                            <Avatar className="relative z-10 flex-shrink-0  rounded-full flex items-center justify-center">
                              <AvatarImage src={tx.depositRecord?.stable === 'usdc' ? usdcIcon.src : usdtIcon.src} />
                            </Avatar>
                          

                          {/* content */}
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-gray-900">To: {tx.destinationUser?.email || '—'}</h4>
                              <span
                                className={`
                      inline-flex items-center text-sm font-medium px-2 py-0.5 rounded-full
                      ${
                        tx.status === TransactionStatus.PENDING
                          ? 'text-yellow-800 bg-yellow-100'
                          : 'text-green-800 bg-green-100'
                      }
                    `}
                              >
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {tx.status.toLowerCase()}
                              </span>
                            </div>
                            <p className="text-gray-500 text-xs mt-1">{ageHours}h ago</p>
                            <p className="text-gray-400 text-xs mt-1">ID: {tx.id.slice(0, 10)}…</p>

                            {/* expandable details */}
                            <AnimatePresence initial={false}>
                              {selectedTransaction?.id === tx.id && isTransactionDetailsOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 border-t pt-4 text-sm text-gray-500 space-y-1"
                                >
                                  <p>Authorization: {tx.depositRecord?.policy}</p>
                                  <p>Sender PubKey: {tx.walletPublicKey}</p>
                                  <p>Receiver PubKey: {tx.destinationAddress}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* footer */}
                            <div className="mt-4 flex justify-between items-center">
                              <span className="font-semibold text-gray-800">
                                {tx.amount} {tx.depositRecord?.stable?.toUpperCase()}
                              </span>
                              {isSender && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="hover:scale-105 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSignatureComplete()
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
                  <h3 className="text-xl font-medium text-slate-700 mb-2">You don’t have any active deposits!</h3>
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

            <TabsContent value="history" className="p-4 mt-0">
              {isLoadingTransactions ? (
                <div className="py-8 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7dfbe] border-t-transparent" />
                </div>
              ) : transactions?.transactions && transactions.transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.transactions
                    .filter((tx) => tx.status !== 'PENDING')
                    .map((transaction) => (
                      <TransactionCard
                        key={transaction.id}
                        id={transaction.id}
                        amount={transaction.amount}
                        token={transaction.depositRecord?.stable === 'usdc' ? 'USDC' : 'USDT'}
                        recipientEmail={
                          transaction.destinationUserId ? (transaction.destinationUser?.email as string) : ''
                        }
                        createdAt={new Date(transaction.createdAt)}
                        status={transaction.status}
                        authorization={transaction.depositRecord?.policy as SignatureType}
                        isDepositor={true}
                        onClick={() => handleOpenTransactionDetails(transaction)}
                      />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <h3 className="text-xl font-medium text-slate-700 mb-2">Nothing to be found here!</h3>
                  <p className="text-slate-500 mb-6">Start by sending or depositing funds.</p>
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