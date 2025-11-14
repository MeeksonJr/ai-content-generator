"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Copy, Twitter, Facebook, Linkedin, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

interface ShareButtonProps {
  title: string
  url: string
  excerpt?: string
}

export function ShareButton({ title, url, excerpt }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const fullUrl = typeof window !== "undefined" ? window.location.href : url
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Article link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const shareToTwitter = () => {
    const text = encodeURIComponent(title)
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(fullUrl)}`
    window.open(twitterUrl, "_blank", "width=550,height=420")
  }

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`
    window.open(facebookUrl, "_blank", "width=550,height=420")
  }

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`
    window.open(linkedInUrl, "_blank", "width=550,height=420")
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Check out: ${title}`)
    const body = encodeURIComponent(`${excerpt || title}\n\n${fullUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      return
    }

    try {
      await navigator.share({
        title,
        text: excerpt || title,
        url: fullUrl,
      })
    } catch (_error) {
      // User cancelled or error occurred
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-gray-300">
          <Share2 className="h-4 w-4 mr-2" />
          Share Article
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canNativeShare && (
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Share2 className="h-4 w-4 mr-2" />
            Share via...
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter} className="cursor-pointer">
          <Twitter className="h-4 w-4 mr-2" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToFacebook} className="cursor-pointer">
          <Facebook className="h-4 w-4 mr-2" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToLinkedIn} className="cursor-pointer">
          <Linkedin className="h-4 w-4 mr-2" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareViaEmail} className="cursor-pointer">
          <Mail className="h-4 w-4 mr-2" />
          Share via Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

