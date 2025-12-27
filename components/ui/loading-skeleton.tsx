import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Blog Post Card Skeleton
 */
export function BlogPostSkeleton() {
  return (
    <Card className="bg-white border-gray-200">
      <Skeleton className="h-48 w-full rounded-t-lg" />
      <CardHeader>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Stats Card Skeleton
 */
export function StatsSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 rounded-lg bg-gray-900/50 border border-gray-800">
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

/**
 * Feature Card Skeleton
 */
export function FeatureCardSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 p-6 bg-black/50">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

/**
 * Pricing Card Skeleton
 */
export function PricingCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-gray-800 bg-gray-950 p-6">
      <Skeleton className="h-6 w-24 mb-2" />
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-10 w-32 mb-2" />
      <Skeleton className="h-4 w-20 mb-6" />
      <div className="space-y-2 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded" />
    </div>
  )
}

/**
 * Testimonial Card Skeleton
 */
export function TestimonialCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-gray-800 bg-black/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <Skeleton className="h-3 w-32" />
      <div className="flex gap-1 mt-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-4 rounded" />
        ))}
      </div>
    </div>
  )
}

/**
 * Page Header Skeleton
 */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
    </div>
  )
}

/**
 * Content Grid Skeleton
 */
export function ContentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <BlogPostSkeleton key={i} />
      ))}
    </div>
  )
}

