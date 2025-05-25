'use client'

import React, { useState } from 'react'
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
import { toast } from 'sonner'
import TransactionDetails from '@/components/transactions/transaction-details'
import { TransactionDetailsData } from '@/types/transaction'
import { parseTransactionSignatures } from '@/utils/transaction'
import { cn } from '@/lib/utils'

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
    return `${signature.slice(0, 20)}...${signature.slice(-20)}`
  }

  

  const openExplorer = (signature: string) => {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    window.open(explorerUrl, '_blank')
  }

  return (
    <div className="py-4 sm:py-3 lg:py-5 md:px-1 px-6 max-w-[1400px] mx-auto ">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
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
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b-2 hover:bg-muted/30">
                      <TableHead className="w-[80px] text-center font-semibold">Type</TableHead>
                      <TableHead className="min-w-[140px] font-semibold">Amount</TableHead>
                      <TableHead className="min-w-[220px] font-semibold">Recipient/Sender</TableHead>
                      <TableHead className="min-w-[130px] font-semibold">Status</TableHead>
                      <TableHead className="min-w-[180px] font-semibold">Date</TableHead>
                      <TableHead className="w-[50px] text-center"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredTransactions.map((tx, idx) => (
                      <React.Fragment key={tx.id}>
                        {/* Summary row */}
                        <TableRow
                          onClick={() => toggleRowExpansion(tx.id)}
                          className={cn(
                            'cursor-pointer hover:bg-muted/50 transition-all duration-200 border-b',
                            idx % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                          )}
                        >
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">{getTypeIcon(tx)}</div>
                          </TableCell>

                          <TableCell className="min-w-[140px]">
                            <div className="flex items-center gap-3">
                              <Image
                                src={tx.depositRecord?.stable === 'usdc' ? 'usdc.svg' : 'usdt-round.svg'}
                                alt={tx.depositRecord?.stable || 'Token'}
                                width={24}
                                height={24}
                                className="flex-shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold text-base">{tx.amount.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {tx.depositRecord?.stable?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="min-w-[220px]">
                            <div className="flex flex-col gap-1">
                              <span
                                className="font-medium text-sm truncate max-w-[200px]"
                                title={tx.isSent ? tx.destinationUser?.email || '—' : tx.user?.email || '—'}
                              >
                                {tx.isSent ? tx.destinationUser?.email || '—' : tx.user?.email || '—'}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {tx.isSent ? 'To' : 'From'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="min-w-[130px]">{getStatusBadge(tx)}</TableCell>

                          <TableCell className="min-w-[180px] text-muted-foreground">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">{formatDate(tx.createdAt)}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {expandedRows.has(tx.id) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Detail row */}
                        {expandedRows.has(tx.id) && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="bg-[#1c3144]/7 border-t border-border/50"
                              >
                                <div className="p-8">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left column */}
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
                                        <h4 className="text-lg font-bold text-foreground tracking-tight">
                                          Transaction Details
                                        </h4>
                                      </div>

                                      <div className="space-y-5">
                                        <div className="group">
                                          <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                            Policy
                                          </p>
                                          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 group-hover:border-border transition-colors">
                                            <p className="font-semibold text-foreground">
                                              {tx.depositRecord?.policy || '—'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="group">
                                          <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                            Deposit ID
                                          </p>
                                          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 group-hover:border-border transition-colors">
                                            <div className="flex items-center justify-between">
                                              <code className="text-sm font-mono bg-muted/50 px-3 py-2 rounded-md border w-full">
                                                {tx.depositRecord?.id ? truncateSignature(tx.depositRecord.id) : '—'}
                                              </code>
                                              {tx.depositRecord?.id && (
                                                <button
                                                  className="p-2 hover:bg-muted/50 rounded-md transition-colors group/btn"
                                                  onClick={() => copyToClipboard(tx.depositRecord!.id)}
                                                >
                                                  <Copy className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {tx.signature && (
                                          <div className="group">
                                            <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                              Transaction Signature
                                            </p>
                                            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 group-hover:border-border transition-colors">
                                              <div className="flex items-center justify-between">
                                                <code className="text-sm font-mono bg-muted/50 px-3 py-2 rounded-md border">
                                                  {truncateSignature(tx.signature)}
                                                </code>
                                                <button
                                                  className="p-2 hover:bg-muted/50 rounded-md transition-colors group/btn"
                                                  onClick={() => copyToClipboard(tx.signature!)}
                                                >
                                                  <Copy className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right column */}
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
                                        <h4 className="text-lg font-bold text-foreground tracking-tight">Actions</h4>
                                      </div>

                                      <div className="space-y-4">
                                        <button
                                          className="w-full flex items-center gap-4 p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:border-border hover:bg-card/70 transition-all duration-200 group"
                                          onClick={() => {
                                            
                                          }}
                                        >
                                          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                            <ExternalLink className="w-5 h-5 text-primary" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold text-foreground">View Details</p>
                                            <p className="text-sm text-muted-foreground">
                                              Open detailed transaction view
                                            </p>
                                          </div>
                                        </button>

                                        {tx.signature && (
                                          <button
                                            className="w-full flex items-center gap-4 p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:border-border hover:bg-card/70 transition-all duration-200 group"
                                            onClick={() => openExplorer(tx.signature!)}
                                          >
                                            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                              <ExternalLink className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="text-left">
                                              <p className="font-semibold text-foreground">View on Explorer</p>
                                              <p className="text-sm text-muted-foreground">Open in Solana Explorer</p>
                                            </div>
                                          </button>
                                        )}

                                        <button
                                          className="w-full flex items-center gap-4 p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:border-border hover:bg-card/70 transition-all duration-200 group"
                                          onClick={() => copyToClipboard(tx.depositRecord?.id ?? tx.id)}
                                        >
                                          <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                                            <Copy className="w-5 h-5 text-green-500" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold text-foreground">Copy Transaction ID</p>
                                            <p className="text-sm text-muted-foreground">Copy ID to clipboard</p>
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
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