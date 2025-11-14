"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Activity,
  AlertTriangle,
  Loader2,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"

type SubscriptionRow = {
  id: string
  plan_type: string
  status: string
  started_at: string | null
  expires_at: string | null
  updated_at: string | null
}

export type AdminUserRecord = {
  id: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
  subscription?: SubscriptionRow
  usage: {
    totalContent: number
    totalSentiment: number
    totalKeywords: number
    totalSummaries: number
  }
}

type AdminUsersClientProps = {
  initialUsers: AdminUserRecord[]
}

export function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = user.id.toLowerCase().includes(search.toLowerCase())
      const subscription = user.subscription
      const matchesPlan = planFilter === "all" || (subscription?.plan_type || "none") === planFilter
      const matchesStatus = statusFilter === "all" || (subscription?.status || "unknown") === statusFilter
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [users, search, planFilter, statusFilter])

  const stats = useMemo(() => {
    const totalAdmins = users.filter((user) => user.isAdmin).length
    const activeSubs = users.filter((user) => user.subscription?.status === "active").length
    const cancelledSubs = users.filter((user) => user.subscription?.status === "cancelled").length
    const trialingSubs = users.filter((user) => user.subscription?.status === "trialing").length
    return {
      total: users.length,
      admins: totalAdmins,
      active: activeSubs,
      cancelled: cancelledSubs,
      trialing: trialingSubs,
    }
  }, [users])

  const handleUpdateUser = async (userId: string, payload: { isAdmin?: boolean; subscriptionStatus?: string }) => {
    try {
      setLoadingUserId(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update user" }))
        throw new Error(errorData.error || "Failed to update user")
      }

      const data = await response.json()

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isAdmin: typeof payload.isAdmin === "boolean" ? payload.isAdmin : user.isAdmin,
                subscription: data.subscription || user.subscription,
              }
            : user,
        ),
      )

      toast({
        title: "Update successful",
        description: "User settings have been updated.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setLoadingUserId(null)
    }
  }

  const renderPlanBadge = (plan?: string) => {
    if (!plan) {
      return <Badge variant="outline">Free</Badge>
    }

    const colors: Record<string, string> = {
      professional: "bg-blue-900/20 text-blue-400 border-blue-800",
      enterprise: "bg-purple-900/20 text-purple-400 border-purple-800",
    }

    return (
      <Badge variant="outline" className={colors[plan] || ""}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    )
  }

  const renderStatusBadge = (status?: string) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>
    }
    const variants: Record<string, string> = {
      active: "bg-green-900/20 text-green-400 border-green-800",
      cancelled: "bg-red-900/20 text-red-400 border-red-800",
      trialing: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
      past_due: "bg-orange-900/20 text-orange-400 border-orange-800",
    }
    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{stats.admins}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm text-muted-foreground">Active Plans</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-sm text-muted-foreground">Cancelled/Past Due</p>
              <p className="text-2xl font-bold">{stats.cancelled + stats.trialing}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>Find users by id, plan or status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-950 border-gray-800"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full md:w-48 bg-gray-950 border-gray-800">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="none">Free</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-gray-950 border-gray-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past due</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Detailed overview of all accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users match the current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">User ID: {user.id}</p>
                        {user.isAdmin && (
                          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        {user.subscription && (
                          <>
                            {renderPlanBadge(user.subscription.plan_type)}
                            {renderStatusBadge(user.subscription.status)}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        disabled={loadingUserId === user.id}
                        onClick={() => handleUpdateUser(user.id, { isAdmin: !user.isAdmin })}
                      >
                        {loadingUserId === user.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                          </>
                        ) : user.isAdmin ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" /> Revoke Admin
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" /> Make Admin
                          </>
                        )}
                      </Button>
                      {user.subscription && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700"
                          disabled={loadingUserId === user.id}
                          onClick={() =>
                            handleUpdateUser(user.id, {
                              subscriptionStatus: user.subscription?.status === "active" ? "cancelled" : "active",
                            })
                          }
                        >
                          {loadingUserId === user.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                            </>
                          ) : user.subscription?.status === "active" ? (
                            "Cancel Plan"
                          ) : (
                            "Activate Plan"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="p-3 rounded-lg border border-gray-800 bg-gray-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Content Generated</p>
                      <p className="text-xl font-semibold text-white">{user.usage.totalContent}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-800 bg-gray-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Sentiment Analyses</p>
                      <p className="text-xl font-semibold text-white">{user.usage.totalSentiment}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-800 bg-gray-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Keyword Extracts</p>
                      <p className="text-xl font-semibold text-white">{user.usage.totalKeywords}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-800 bg-gray-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Summaries</p>
                      <p className="text-xl font-semibold text-white">{user.usage.totalSummaries}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

