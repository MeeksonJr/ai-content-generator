"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X, Filter, SortAsc, SortDesc } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface BlogFiltersProps {
  categories: string[]
  onFiltersChange: (filters: {
    category: string | null
    sort: string
    dateFrom: string | null
    dateTo: string | null
  }) => void
}

export function BlogFilters({ categories, onFiltersChange }: BlogFiltersProps) {
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<string>("newest")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  useEffect(() => {
    onFiltersChange({
      category,
      sort,
      dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : null,
      dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : null,
    })
  }, [category, sort, dateFrom, dateTo, onFiltersChange])

  const handleClearFilters = () => {
    setCategory(null)
    setSort("newest")
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const hasActiveFilters = category || sort !== "newest" || dateFrom || dateTo

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? null : value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Sort By</label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <SortDesc className="h-3 w-3" />
                  Newest First
                </div>
              </SelectItem>
              <SelectItem value="oldest">
                <div className="flex items-center gap-2">
                  <SortAsc className="h-3 w-3" />
                  Oldest First
                </div>
              </SelectItem>
              <SelectItem value="most_viewed">Most Viewed</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                disabled={(date) => dateFrom ? date < dateFrom : false}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

