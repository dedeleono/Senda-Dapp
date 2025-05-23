'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Search, 
  ChevronDown, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { trpc } from '@/app/_trpc/client'
import { useWalletStore } from '@/stores/use-wallet-store'
import { TransactionStatus, TransactionType, SignatureType } from '@prisma/client'
import Image from 'next/image'
import usdcIcon from '@/public/usdc.svg'
import usdtIcon from '@/public/usdt-round.svg'
import { toast } from 'sonner'
import TransactionDetails from '@/components/transactions/transaction-details'
import { TransactionDetailsData } from '@/types/transaction'
import { parseTransactionSignatures } from '@/utils/transaction'

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

type TransactionStatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'cancelled'
type TransactionTypeFilter = 'all' | 'sent' | 'received'

export default function TransactionsView() {
  const { isAuthenticated, session } = useAuth()
  const { publicKey } = useWalletStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetailsData | null>(null)
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false)

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = trpc.transactionRouter.getUserTransactions.useQuery(
    { limit: 100 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  ) as { data: TransactionResponse | undefined; isLoading: boolean }

  const { data: receivedTransactions, isLoading: isLoadingReceivedTransactions } =
    trpc.transactionRouter.getReceivedTransactions.useQuery(
      { limit: 100 },
      {
        enabled: isAuthenticated,
        retry: false,
      },
    ) as { data: TransactionResponse | undefined; isLoading: boolean }

  const allTransactions = [...(transactions?.transactions || []), ...(receivedTransactions?.transactions || [])]
  
  // Add sent/received classification
  const processedTransactions = allTransactions.map(tx => ({
    ...tx,
    isSent: tx.userId === session?.user.id,
    isReceived: tx.destinationAddress === publicKey?.toString()
  }))

  const toggleRowExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedRows(newExpanded)
  }

  const filteredTransactions = processedTransactions.filter(transaction => {
    const matchesSearch = (transaction.destinationUser?.email || transaction.user?.email || '')
      .toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesStatus = statusFilter === 'all'
    if (!matchesStatus) {
      const state = transaction.depositRecord?.state?.toLowerCase()
      switch (statusFilter) {
        case 'completed':
          matchesStatus = state === 'completed'
          break
        case 'pending':
          matchesStatus = state === 'pending'
          break
        case 'cancelled':
          matchesStatus = state === 'cancelled'
          break
        case 'failed':
          matchesStatus = transaction.status === 'FAILED'
          break
      }
    }
    
    let matchesType = typeFilter === 'all'
    if (!matchesType) {
      switch (typeFilter) {
        case 'sent':
          matchesType = transaction.isSent
          break
        case 'received':
          matchesType = transaction.isReceived
          break
      }
    }
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (transaction: Transaction) => {
    const state = transaction.depositRecord?.state
    switch (state) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{state || transaction.status}</Badge>
    }
  }

  const getTypeIcon = (transaction: Transaction & { isSent: boolean; isReceived: boolean }) => {
    return transaction.isSent 
      ? <ArrowUpRight className="w-4 h-4 text-red-500" />
      : <ArrowDownLeft className="w-4 h-4 text-green-500" />
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateSignature = (signature: string) => {
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`
  }

  const handleOpenTransactionDetails = (transaction: Transaction) => {
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

    setSelectedTransaction(transactionDetails)
    setIsTransactionDetailsOpen(true)
  }

  const openExplorer = (signature: string) => {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    window.open(explorerUrl, '_blank')
  }

  return (
    <div className="py-4 sm:py-3 lg:py-5 md:px-1 px-6 max-w-[1400px] mx-auto ">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-md rounded-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold">Transactions</CardTitle>
            <p className="text-muted-foreground">View and manage your transaction history</p>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: TransactionStatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={(value: TransactionTypeFilter) => setTypeFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoadingTransactions || isLoadingReceivedTransactions ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Recipient/Sender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <React.Fragment key={transaction.id}>
                        <Collapsible 
                          open={expandedRows.has(transaction.id)}
                          onOpenChange={() => toggleRowExpansion(transaction.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <TableCell>
                                {getTypeIcon(transaction)}
                              </TableCell>
                              <TableCell className="font-medium capitalize">
                                {transaction.isSent ? 'Sent' : 'Received'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Image 
                                    src={transaction.depositRecord?.stable === 'usdc' ? usdcIcon : usdtIcon} 
                                    alt={transaction.depositRecord?.stable || 'Token'} 
                                    width={16} 
                                    height={16} 
                                  />
                                  <span className="font-medium">
                                    {transaction.amount.toFixed(2)} {transaction.depositRecord?.stable?.toUpperCase()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {transaction.isSent 
                                  ? transaction.destinationUser?.email || '—'
                                  : transaction.user?.email || '—'
                                }
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(transaction)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(transaction.createdAt)}
                              </TableCell>
                              <TableCell>
                                {expandedRows.has(transaction.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={7} className="p-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="bg-muted/20 p-6 border-t"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                        Transaction Details
                                      </h4>
                                      <div className="space-y-3">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Policy</p>
                                          <p className="font-medium">{transaction.depositRecord?.policy || '—'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Deposit ID</p>
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                              {transaction.depositRecord?.id ? truncateSignature(transaction.depositRecord.id) : '—'}
                                            </code>
                                            {transaction.depositRecord?.id && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(transaction.depositRecord?.id || '')}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        {transaction.signature && (
                                          <div>
                                            <p className="text-sm text-muted-foreground">Transaction Signature</p>
                                            <div className="flex items-center gap-2">
                                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {truncateSignature(transaction.signature)}
                                              </code>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(transaction.signature || '')}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                        Actions
                                      </h4>
                                      <div className="flex flex-col gap-3">
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="justify-start"
                                          onClick={() => handleOpenTransactionDetails(transaction)}
                                        >
                                          <ExternalLink className="w-4 h-4 mr-2" />
                                          View Details
                                        </Button>
                                        {transaction.signature && (
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="justify-start"
                                            onClick={() => openExplorer(transaction.signature || '')}
                                          >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View on Explorer
                                          </Button>
                                        )}
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="justify-start"
                                          onClick={() => copyToClipboard(transaction.depositRecord?.id || transaction.id)}
                                        >
                                          <Copy className="w-4 h-4 mr-2" />
                                          Copy Transaction ID
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </Collapsible>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction Details Modal */}
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