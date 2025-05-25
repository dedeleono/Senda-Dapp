'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Users, 
  Calendar,
  DollarSign,
  Mail,
  ArrowRight,
  Shield,
  Clock,
  Send,
  UserPlus,
  Handshake
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import { useWalletStore } from '@/stores/use-wallet-store'
import Image from 'next/image'
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
  const [inviteEmail, setInviteEmail] = useState('')

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

  const handleOpenDepositModalWithEmail = (prefilledEmail: string) => {
    depositModalRef.current?.open(prefilledEmail)
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
      message = 'Path created and invitation sent! Your friend will receive an email to join and claim the funds.'
    } else if (recipientRole === 'INDIVIDUAL') {
      message = 'Deposit completed. The recipient has been notified.'
    } else {
      message = 'Deposit completed successfully.'
    }
    toast.success(message)
    utils.userRouter.getUserPaths.invalidate()
  }

  const handleInviteFriend = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Open deposit modal - the existing flow will handle creating the user and sending invitation
    handleOpenDepositModalWithEmail(inviteEmail)
    setInviteEmail('')
    toast.success('Opening deposit flow to invite your friend...')
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

  const getEscrowStatus = (path: Path) => {
    const totalValue = getTotalValue(path)
    if (totalValue === 0) {
      return { 
        label: 'Empty', 
        variant: 'secondary' as const,
        description: 'No funds deposited yet'
      }
    }
    if (path.depositCount > 0) {
      return { 
        label: 'Active', 
        variant: 'default' as const,
        description: `${path.depositCount} transaction${path.depositCount !== 1 ? 's' : ''}`
      }
    }
    return { 
      label: 'Pending', 
      variant: 'outline' as const,
      description: 'Awaiting activity'
    }
  }

  const getRoleInEscrow = (path: Path) => {
    const isSender = path.senderPublicKey === publicKey?.toString()
    return isSender ? 'Sender' : 'Receiver'
  }

  const getOtherParty = (path: Path) => {
    const isSender = path.senderPublicKey === publicKey?.toString()
    return isSender ? path.receiver : path.sender
  }

  const activeEscrows = paths.filter(path => getTotalValue(path) > 0)
  const emptyEscrows = paths.filter(path => getTotalValue(path) === 0)

  return (
    <div className="py-4 sm:py-3 lg:py-5 md:px-1 px-6 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <Card className="border-0 shadow-md rounded-xl">
          <CardHeader className="pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Handshake className="w-6 h-6 text-primary" />
                  My Paths
                </CardTitle>
                <p className="text-muted-foreground">Secure escrow accounts with your trusted contacts</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenAddFundsModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Invite Friends Section */}
        <Card className="border-0 shadow-md rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Invite Friends to your Journey
            </CardTitle>
            <p className="text-muted-foreground">
              Send money to a friend and invite them to join Senda - they'll get an email to claim the funds
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter friend's email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInviteFriend()}
                  className="bg-white dark:bg-gray-900"
                />
              </div>
              <Button 
                onClick={handleInviteFriend}
                disabled={!inviteEmail.trim()}
                className="bg-[#1c3144] hover:bg-[#1c3144]/80"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Money & Invite
              </Button>
            </div>
            <div className="mt-4 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">How it works:</p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    1. Choose how much to send and complete the deposit
                    <br />
                    2. Your friend receives an email invitation with the funds waiting
                    <br />
                    3. They join Senda and can immediately claim the money you sent
                    <br />
                    4. Once they're on Senda, you both can use this secure path for future transactions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Escrows */}
        {activeEscrows.length > 0 && (
          <Card className="border-0 shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Active Paths ({activeEscrows.length})
              </CardTitle>
              <p className="text-muted-foreground">Paths with funds available</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEscrows.map((path) => {
                  const otherParty = getOtherParty(path)
                  const role = getRoleInEscrow(path)
                  const totalValue = getTotalValue(path)
                  const status = getEscrowStatus(path)

                  return (
                    <motion.div
                      key={path.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-300 rounded-xl border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={otherParty.image || undefined} />
                              <AvatarFallback className="bg-green-100 text-green-700">
                                {otherParty.email?.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{otherParty.name || otherParty.email}</h3>
                              <p className="text-xs text-muted-foreground">You are the {role}</p>
                            </div>
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Total Value */}
                          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Escrow Value</p>
                            <p className="text-2xl font-bold text-green-600">${totalValue.toFixed(2)}</p>
                          </div>

                          {/* Token Breakdown */}
                          <div className="space-y-2">
                            {path.depositedUsdc > 0 && (
                              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Image src="usdc.svg" alt="USDC" width={16} height={16} />
                                  <span className="text-sm font-medium">USDC</span>
                                </div>
                                <span className="font-medium">{path.depositedUsdc.toFixed(2)}</span>
                              </div>
                            )}
                            {path.depositedUsdt > 0 && (
                              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Image src="usdt-round.svg" alt="USDT" width={16} height={16} />
                                  <span className="text-sm font-medium">USDT</span>
                                </div>
                                <span className="font-medium">{path.depositedUsdt.toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {/* Escrow Details */}
                          <div className="space-y-2 pt-2 border-t text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>Created {formatDate(path.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              <span>{path.depositCount} completed transactions</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {/* <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => window.location.href = '/transactions'}
                            >
                              View History
                            </Button> */}
                            <Button size="sm" className="flex-1 ml-auto" onClick={handleOpenDepositModal}>
                              <Plus className="w-3 h-3 mr-1" />
                              Deposit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty/Pending Escrows */}
        {emptyEscrows.length > 0 && (
          <Card className="border-0 shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Pending Escrows ({emptyEscrows.length})
              </CardTitle>
              <p className="text-muted-foreground">Escrows waiting for initial deposits</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emptyEscrows.map((path) => {
                  const otherParty = getOtherParty(path)
                  const role = getRoleInEscrow(path)

                  return (
                    <motion.div
                      key={path.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-300 rounded-xl border-l-4 border-l-orange-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={otherParty.image || undefined} />
                              <AvatarFallback className="bg-orange-100 text-orange-700">
                                {otherParty.email?.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{otherParty.name || otherParty.email}</h3>
                              <p className="text-xs text-muted-foreground">You are the {role}</p>
                            </div>
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                              Empty
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium">Ready for first deposit</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Start using this escrow by making your first deposit
                            </p>
                          </div>

                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>Created {formatDate(path.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              <span>Escrow with {otherParty.email}</span>
                            </div>
                          </div>

                          <Button className="w-full" onClick={handleOpenDepositModal}>
                            <Plus className="w-4 h-4 mr-2" />
                            Make First Deposit
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {isLoadingPaths ? (
          <Card className="border-0 shadow-md rounded-xl">
            <CardContent className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </CardContent>
          </Card>
        ) : paths.length === 0 ? (
          <Card className="border-0 shadow-md rounded-xl">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Handshake className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No escrows yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Escrows are secure accounts shared between you and another person. Start by inviting a friend or
                creating your first escrow transaction.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleOpenDepositModal} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Escrow
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </motion.div>

      {/* Modals */}
      <DepositModal ref={depositModalRef} onComplete={handleDepositComplete} />
      <AddFundsModal ref={addFundsModalRef} onWalletQRSelected={handleOpenWalletQR} />
      <WalletQRDialog ref={walletQRDialogRef} walletAddress={sendaWalletAddress || ''} />
    </div>
  )
} 