"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Receipt, RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"

type Refund = {
  id: string
  transaction_id: string
  amount: number
  currency: string
  refund_amount: number | null
  refund_currency: string | null
  refund_status: string | null
  refund_id: string | null
  refund_reason: string | null
  refunded_at: string | null
  description: string
  date: string
  status: string
}

export default function RefundsPage() {
  const { toast } = useToast()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRefunds()
  }, [])

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/refunds")
      
      if (!response.ok) {
        throw new Error("Failed to fetch refunds")
      }

      const data = await response.json()
      setRefunds(data.refunds || [])
    } catch (error) {
      console.error("Error fetching refunds:", error)
      toast({
        title: "Error",
        description: "Failed to load refund history. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getRefundStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusLower = status.toLowerCase()
    if (statusLower === "completed") {
      return <Badge className="bg-green-900/20 text-green-400 border-green-800">Completed</Badge>
    }
    if (statusLower === "partial") {
      return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Partial</Badge>
    }
    if (statusLower === "pending") {
      return <Badge className="bg-blue-900/20 text-blue-400 border-blue-800">Pending</Badge>
    }
    if (statusLower === "failed") {
      return <Badge className="bg-red-900/20 text-red-400 border-red-800">Failed</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getRefundStatusIcon = (status: string | null) => {
    if (!status) return null

    const statusLower = status.toLowerCase()
    if (statusLower === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-green-400" />
    }
    if (statusLower === "pending") {
      return <Clock className="h-4 w-4 text-blue-400" />
    }
    if (statusLower === "failed") {
      return <XCircle className="h-4 w-4 text-red-400" />
    }
    return <AlertCircle className="h-4 w-4 text-yellow-400" />
  }

  const totalRefunded = refunds.reduce((sum, refund) => {
    return sum + (Number(refund.refund_amount) || 0)
  }, 0)

  const completedRefunds = refunds.filter((r) => r.refund_status === "completed").length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Refund History</h2>
            <p className="text-muted-foreground">View your refund requests and processed refunds</p>
          </div>
          <Button variant="outline" onClick={fetchRefunds} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Receipt className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold">{refunds.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedRefunds}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <RefreshCw className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Total Refunded</p>
                <p className="text-2xl font-bold">
                  {refunds[0]?.refund_currency || "USD"} {(Number(totalRefunded) || 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refunds List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Refund History</CardTitle>
            <CardDescription>All refunded payments and transactions</CardDescription>
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
            ) : refunds.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No refund history found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Refunded payments will appear here once processed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-gray-800 rounded-lg bg-gray-950"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">
                          {refund.description || "Payment refund"}
                        </p>
                        {getRefundStatusBadge(refund.refund_status)}
                        {refund.refund_status === "partial" && (
                          <Badge variant="outline" className="text-xs">
                            Partial
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          {format(new Date(refund.date), "MMM dd, yyyy")}
                        </span>
                        <span className="font-semibold text-white">
                          Original: {refund.currency} {(Number(refund.amount) || 0).toFixed(2)}
                        </span>
                        {refund.refund_amount && (
                          <span className="font-semibold text-green-400">
                            Refunded: {refund.refund_currency || refund.currency}{" "}
                            {(Number(refund.refund_amount) || 0).toFixed(2)}
                          </span>
                        )}
                        {refund.refund_id && (
                          <span className="text-xs">Refund ID: {refund.refund_id.substring(0, 20)}...</span>
                        )}
                      </div>
                      {refund.refund_reason && (
                        <p className="text-sm text-muted-foreground">Reason: {refund.refund_reason}</p>
                      )}
                      {refund.refunded_at && (
                        <p className="text-xs text-muted-foreground">
                          Processed: {format(new Date(refund.refunded_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getRefundStatusIcon(refund.refund_status)}
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

