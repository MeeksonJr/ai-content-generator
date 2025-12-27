"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Download, Receipt, Calendar, DollarSign, AlertCircle } from "lucide-react"
import { format } from "date-fns"

type Payment = {
  id: string
  status: string
  amount: number
  currency: string
  date: string
  description: string
  subscriptionId?: string
  planType?: string | null
  receiptUrl?: string | null
  source?: string
}

export default function PaymentHistoryPage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/payment-history")
      
      if (!response.ok) {
        throw new Error("Failed to fetch payment history")
      }

      const data = await response.json()
      setPayments(data.payments || [])
    } catch (error) {
      console.error("Error fetching payment history:", error)
      toast({
        title: "Error",
        description: "Failed to load payment history. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      if (payment.receiptUrl) {
        // Open PayPal receipt URL
        window.open(payment.receiptUrl, "_blank")
      } else {
        // Generate receipt from payment data
        const response = await fetch(`/api/invoices/generate?paymentId=${payment.id}`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `receipt-${payment.id}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          throw new Error("Failed to generate receipt")
        }
      }
    } catch (error) {
      console.error("Error downloading receipt:", error)
      toast({
        title: "Error",
        description: "Failed to download receipt. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "completed" || statusLower === "s") {
      return <Badge className="bg-green-900/20 text-green-400 border-green-800">Completed</Badge>
    }
    if (statusLower === "pending" || statusLower === "p") {
      return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Pending</Badge>
    }
    if (statusLower === "failed" || statusLower === "f") {
      return <Badge className="bg-red-900/20 text-red-400 border-red-800">Failed</Badge>
    }
    if (statusLower === "refunded" || statusLower === "r") {
      return <Badge className="bg-orange-900/20 text-orange-400 border-orange-800">Refunded</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const totalAmount = payments
    .filter((p) => {
      const status = String(p.status || "").toLowerCase()
      return status === "completed" || status === "s"
    })
    .reduce((sum, p) => {
      const amount = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount || 0)) || 0
      return sum + amount
    }, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payment History</h2>
          <p className="text-muted-foreground">View your subscription payments and download receipts</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Receipt className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">
                  ${(Number(totalAmount) || 0).toFixed(2)} {payments[0]?.currency || "USD"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {
                    payments.filter(
                      (p) =>
                        new Date(p.date).getMonth() === new Date().getMonth() &&
                        new Date(p.date).getFullYear() === new Date().getFullYear() &&
                        (p.status.toLowerCase() === "completed" || p.status.toLowerCase() === "s")
                    ).length
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>All your subscription payments and transactions</CardDescription>
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
                <p className="text-muted-foreground">No payment history found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your payment history will appear here once you make a subscription payment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-gray-800 rounded-lg bg-gray-950"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">
                          {payment.description || "Subscription payment"}
                        </p>
                        {getStatusBadge(payment.status)}
                        {payment.planType && (
                          <Badge variant="outline" className="text-xs">
                            {payment.planType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(payment.date), "MMM dd, yyyy")}
                        </span>
                        <span className="font-semibold text-white">
                          {payment.currency} ${(Number(payment.amount) || 0).toFixed(2)}
                        </span>
                        {payment.source && (
                          <span className="text-xs">Source: {payment.source}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => handleDownloadReceipt(payment)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

