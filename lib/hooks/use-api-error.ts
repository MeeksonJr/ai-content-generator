"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { extractApiErrorMessage, getUserFriendlyErrorMessage } from "@/lib/utils/error-handler"

/**
 * Hook for handling API errors in components
 * Provides consistent error handling and user-friendly messages
 */
export function useApiError() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleApiCall = useCallback(
    async <T,>(
      apiCall: () => Promise<Response>,
      options?: {
        onSuccess?: (data: T) => void
        onError?: (error: string) => void
        successMessage?: string
        loadingMessage?: string
      }
    ): Promise<T | null> => {
      setIsLoading(true)

      try {
        const response = await apiCall()

        if (!response.ok) {
          const errorMessage = await extractApiErrorMessage(response)
          
          if (options?.onError) {
            options.onError(errorMessage)
          } else {
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            })
          }

          return null
        }

        const data = (await response.json()) as T

        if (options?.onSuccess) {
          options.onSuccess(data)
        }

        if (options?.successMessage) {
          toast({
            title: "Success",
            description: options.successMessage,
          })
        }

        return data
      } catch (error) {
        const errorMessage = getUserFriendlyErrorMessage(error)

        if (options?.onError) {
          options.onError(errorMessage)
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }

        return null
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  return { handleApiCall, isLoading }
}

