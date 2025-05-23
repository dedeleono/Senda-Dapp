'use client'

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import { useWalletStore } from '@/stores/use-wallet-store'
import Image from 'next/image'
import usdcIcon from '@/public/usdc.svg'
import usdtIcon from '@/public/usdt-round.svg'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import DepositModal, { DepositModalRef } from '@/components/deposit/deposit-modal'
import AddFundsModal, { AddFundsModalRef } from '@/components/deposit/add-funds-modal'
import WalletQRDialog, { WalletQRDialogRef } from '../../home/_components/wallet-qr-dialog'

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

export default function MyPathsView() {
  const { isAuthenticated, session } = useAuth()
  const { publicKey } = useWalletStore()

  // Modal refs
  const depositModalRef = useRef<DepositModalRef>(null)
  const addFundsModalRef = useRef<AddFundsModalRef>(null)
  const walletQRDialogRef = useRef<WalletQRDialogRef>(null)
  
  const utils = trpc.useContext()

  // Get wallet address for QR dialog
  const sendaWalletAddress = publicKey?.toString() || null

  // Fetch paths for this user
  const { data: pathsData, isLoading: isLoadingPaths } = trpc.userRouter.getUserPaths.useQuery(
    { userId: session?.user.id as string },
    {
      enabled: isAuthenticated && !!session?.user.id,
      retry: false,
    },
  ) as { data: PathsResponse | undefined; isLoading: boolean }

  const paths = pathsData?.paths || []

  // Modal handlers
  const handleOpenDepositModal = () => {
    depositModalRef.current?.open()
  }

  const handleOpenAddFundsModal = () => {
    addFundsModalRef.current?.open()
  }

  const handleOpenWalletQR = () => {
    walletQRDialogRef.current?.open()
  }

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
    utils.userRouter.getUserPaths.invalidate()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTotalValue = (path: Path) => {
    return path.depositedUsdc + path.depositedUsdt
  }

  const getStatusBadge = (path: Path) => {
    // Since paths don't have explicit status, we'll derive it from deposits
    if (path.depositCount === 0) {
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Inactive</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Active</Badge>
  }

  const getRoleInPath = (path: Path) => {
    const isSender = path.senderPublicKey === publicKey?.toString()
    return isSender ? 'Sender' : 'Receiver'
  }

  const getOtherParty = (path: Path) => {
    const isSender = path.senderPublicKey === publicKey?.toString()
    return isSender ? path.receiver : path.sender
  }

  return (
    <div className="py-4 sm:py-3 lg:py-5 md:px-1 px-6 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-md rounded-xl mb-6">
          <CardHeader className="pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">My Paths</CardTitle>
                <p className="text-muted-foreground">Your established transaction pathways with other users</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleOpenAddFundsModal}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>
                <Button onClick={handleOpenDepositModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Transaction
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoadingPaths ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : paths.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No paths yet</h3>
                <p className="text-muted-foreground mb-6">
                  Paths are created automatically when you send or receive transactions with other users
                </p>
                <Button onClick={handleOpenDepositModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start Your First Transaction
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paths.map((path) => {
                  const otherParty = getOtherParty(path)
                  const role = getRoleInPath(path)
                  const totalValue = getTotalValue(path)

                  return (
                    <motion.div
                      key={path.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow duration-300 rounded-xl">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={otherParty.image || undefined} />
                                  <AvatarFallback>
                                    {otherParty.email?.slice(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold text-base">{otherParty.name || otherParty.email}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    You are the {role}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(path)}
                                <Badge variant="outline" className="text-xs">
                                  {path.depositCount} transaction{path.depositCount !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Total Value */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Total Value</span>
                              <span className="text-lg font-bold">
                                ${totalValue.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Token Breakdown */}
                          {(path.depositedUsdc > 0 || path.depositedUsdt > 0) && (
                            <div className="space-y-2">
                              {path.depositedUsdc > 0 && (
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Image 
                                      src={usdcIcon} 
                                      alt="USDC" 
                                      width={16} 
                                      height={16} 
                                    />
                                    <span className="text-sm font-medium">USDC</span>
                                  </div>
                                  <span className="font-medium">
                                    {path.depositedUsdc.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {path.depositedUsdt > 0 && (
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Image 
                                      src={usdtIcon} 
                                      alt="USDT" 
                                      width={16} 
                                      height={16} 
                                    />
                                    <span className="text-sm font-medium">USDT</span>
                                  </div>
                                  <span className="font-medium">
                                    {path.depositedUsdt.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Path Details */}
                          <div className="grid grid-cols-1 gap-3 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {role === 'Sender' ? 'Sending to' : 'Receiving from'} {otherParty.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Created {formatDate(path.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {path.depositCount} transaction{path.depositCount !== 1 ? 's' : ''} completed
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => window.location.href = '/transactions'}
                            >
                              View Transactions
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={handleOpenDepositModal}
                            >
                              New Transaction
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
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