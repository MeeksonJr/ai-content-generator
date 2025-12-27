"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  Receipt,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  DollarSign,
} from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Payment = {
  id: string
  transaction_id: string
  amount: number
  currency: string
  status: string
  description: string
  date: string
  user_id: string
  refund_status: string | null
  refund_amount: number | null
  refund_id: string | null
}

export default function AdminRefundsPage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [refunding, setRefunding] = useState<string | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    try {
      const adminResponse = await fetch("/api/admin/check")
      if (!adminResponse.ok) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const adminData = await adminResponse.json()
      if (!adminData.isAdmin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      await fetchPayments()
    } catch (error) {
      console.error("Error checking admin status:", error)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      // Fetch all payments that can be refunded (completed payments)
      const response = await fetch("/api/admin/payments?status=completed")
      
      if (!response.ok) {
        throw new Error("Failed to fetch payments")
      }

      const data = await response.json()
      setPayments(data.payments || [])
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast({
        title: "Error",
        description: "Failed to load payments. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefundClick = (payment: Payment) => {
    setSelectedPayment(payment)
    setRefundAmount("")
    setRefundReason("")
    setRefundDialogOpen(true)
  }

  const handleProcessRefund = async () => {
    if (!selectedPayment) return

    try {
      setRefunding(selectedPayment.id)
      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          transactionId: selectedPayment.transaction_id,
          amount: refundAmount ? Number.parseFloat(refundAmount) : undefined,
          reason: refundReason || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process refund")
      }

      toast({
        title: "Refund processed",
        description: "The refund has been processed successfully.",
      })

      setRefundDialogOpen(false)
      setSelectedPayment(null)
      setRefundAmount("")
      setRefundReason("")
      await fetchPayments()
    } catch (error) {
      console.error("Error processing refund:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process refund",
        variant: "destructive",
      })
    } finally {
      setRefunding(null)
    }
  }

  const getRefundStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusLower = status.toLowerCase()
    if (statusLower === "completed") {
      return <Badge className="bg-green-900/20 text-green-400 border-green-800">Refunded</Badge>
    }
    if (statusLower === "partial") {
      return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Partially Refunded</Badge>
    }
    if (statusLower === "pending") {
      return <Badge className="bg-blue-900/20 text-blue-400 border-blue-800">Refund Pending</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getRemainingRefundable = (payment: Payment): number => {
    const total = Number(payment.amount) || 0
    const refunded = Number(payment.refund_amount) || 0
    return total - refunded
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be an administrator to access this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Refund Management</h2>
            <p className="text-muted-foreground">Process refunds for payments</p>
          </div>
          <Button variant="outline" onClick={fetchPayments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Payments List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Refundable Payments</CardTitle>
            <CardDescription>Process refunds for completed payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No refundable payments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => {
                  const remaining = getRemainingRefundable(payment)
                  const canRefund = remaining > 0 && payment.status.toLowerCase() === "completed"

                  return (
                    <div
                      key={payment.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-gray-800 rounded-lg bg-gray-950"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">
                            {payment.description || "Payment"}
                          </p>
                          {getRefundStatusBadge(payment.refund_status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            {format(new Date(payment.date), "MMM dd, yyyy")}
                          </span>
                          <span className="font-semibold text-white">
                            {payment.currency} {(Number(payment.amount) || 0).toFixed(2)}
                          </span>
                          {payment.refund_amount && (
                            <span className="font-semibold text-yellow-400">
                              Refunded: {payment.currency} {(Number(payment.refund_amount) || 0).toFixed(2)}
                            </span>
                          )}
                          {remaining > 0 && (
                            <span className="font-semibold text-green-400">
                              Refundable: {payment.currency} {remaining.toFixed(2)}
                            </span>
                          )}
                          {payment.transaction_id && (
                            <span className="text-xs">Transaction: {payment.transaction_id.substring(0, 20)}...</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canRefund ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefundClick(payment)}
                            className="border-gray-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Process Refund
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {payment.refund_status === "completed"
                              ? "Fully Refunded"
                              : payment.status.toLowerCase() !== "completed"
                                ? "Not Refundable"
                                : "Cannot Refund"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refund Dialog */}
        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                {selectedPayment && (
                  <>
                    Refund payment: {selectedPayment.description || "Payment"} - {selectedPayment.currency}{" "}
                    {(Number(selectedPayment.amount) || 0).toFixed(2)}
                    {selectedPayment.refund_amount && (
                      <> (Already refunded: {selectedPayment.currency} {(Number(selectedPayment.refund_amount) || 0).toFixed(2)})</>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="refund-amount">Refund Amount (Optional)</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={getRemainingRefundable(selectedPayment).toFixed(2)}
                    placeholder={`Leave empty for full refund (${selectedPayment.currency} ${getRemainingRefundable(selectedPayment).toFixed(2)})`}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum refundable: {selectedPayment.currency} {getRemainingRefundable(selectedPayment).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refund-reason">Reason (Optional)</Label>
                  <Textarea
                    id="refund-reason"
                    placeholder="Enter reason for refund..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessRefund}
                disabled={refunding !== null}
                className="bg-red-600 hover:bg-red-700"
              >
                {refunding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Process Refund
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

