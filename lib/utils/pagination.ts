/**
 * Pagination utilities
 */

export interface PaginationParams {
  page: number
  limit: number
  total: number
}

export interface PaginationResult {
  offset: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  currentPage: number
}

/**
 * Calculate pagination parameters
 */
export function calculatePagination(params: PaginationParams): PaginationResult {
  const { page, limit, total } = params

  const currentPage = Math.max(1, page)
  const totalPages = Math.ceil(total / limit)
  const offset = (currentPage - 1) * limit

  return {
    offset,
    limit,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    currentPage,
  }
}

/**
 * Generate pagination page numbers
 */
export function generatePageNumbers(currentPage: number, totalPages: number, maxPages = 7): number[] {
  const pages: number[] = []
  const halfMax = Math.floor(maxPages / 2)

  let startPage = Math.max(1, currentPage - halfMax)
  let endPage = Math.min(totalPages, currentPage + halfMax)

  // Adjust if we're near the start
  if (currentPage <= halfMax) {
    endPage = Math.min(maxPages, totalPages)
  }

  // Adjust if we're near the end
  if (currentPage >= totalPages - halfMax) {
    startPage = Math.max(1, totalPages - maxPages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return pages
}

