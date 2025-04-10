"use client"

import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default function SubscriptionCancelPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex justify-center items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              Subscription Cancelled
            </CardTitle>
            <CardDescription>Your subscription process was cancelled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You have cancelled the subscription process. No charges have been made to your account.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => router.push("/dashboard/subscription")}>Return to Subscription Page</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
