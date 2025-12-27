import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * Export content in various formats
 * Supports: PDF, Markdown, DOCX, TXT
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get("id")
    const format = searchParams.get("format") || "markdown"

    if (!contentId) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    // Fetch content
    const { data: content, error: contentError } = await supabase
      .from("content")
      .select("*")
      .eq("id", contentId)
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (contentError || !content) {
      const { statusCode, error } = handleApiError(
        contentError || new Error("Content not found"),
        "Content Export"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Generate export based on format
    switch (format.toLowerCase()) {
      case "markdown":
        return generateMarkdown(content)
      case "txt":
      case "text":
        return generateText(content)
      case "html":
        return generateHTML(content)
      case "pdf":
        // For PDF, we'll generate HTML that can be printed to PDF
        // In production, use a library like pdfkit or puppeteer
        return generateHTML(content, true)
      case "docx":
        // For DOCX, we'll generate a simple text format
        // In production, use a library like docx
        return generateText(content, "docx")
      default:
        return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 })
    }
  } catch (error) {
    logger.error("Error exporting content", {
      context: "ContentExport",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Content Export")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

function generateMarkdown(content: any) {
  const metadata: string[] = []
  
  if (content.title) metadata.push(`# ${content.title}\n`)
  if (content.content_type) metadata.push(`**Type:** ${content.content_type}\n`)
  if (content.created_at) metadata.push(`**Created:** ${new Date(content.created_at).toLocaleString()}\n`)
  if (content.sentiment) metadata.push(`**Sentiment:** ${content.sentiment}\n`)
  if (content.keywords && content.keywords.length > 0) {
    metadata.push(`**Keywords:** ${content.keywords.join(", ")}\n`)
  }
  
  const markdown = [
    ...metadata,
    "\n---\n\n",
    content.content || "",
  ].join("\n")

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(content.title || "content")}.md"`,
    },
  })
}

function generateText(content: any, format: string = "txt") {
  const metadata: string[] = []
  
  if (content.title) metadata.push(`${content.title}\n`)
  metadata.push("=".repeat(content.title?.length || 50))
  if (content.content_type) metadata.push(`\nType: ${content.content_type}`)
  if (content.created_at) metadata.push(`Created: ${new Date(content.created_at).toLocaleString()}`)
  if (content.sentiment) metadata.push(`Sentiment: ${content.sentiment}`)
  if (content.keywords && content.keywords.length > 0) {
    metadata.push(`Keywords: ${content.keywords.join(", ")}`)
  }
  
  const text = [
    ...metadata,
    "\n" + "-".repeat(50) + "\n\n",
    content.content || "",
  ].join("\n")

  const extension = format === "docx" ? "txt" : "txt"
  const mimeType = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain"

  return new NextResponse(text, {
    headers: {
      "Content-Type": `${mimeType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${sanitizeFilename(content.title || "content")}.${extension}"`,
    },
  })
}

function generateHTML(content: any, forPDF: boolean = false) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || "Content"}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    .metadata {
      border-bottom: 2px solid #ddd;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .metadata-item {
      margin: 5px 0;
      color: #666;
    }
    .content {
      white-space: pre-wrap;
      font-size: 16px;
    }
    h1 {
      color: #000;
      margin-bottom: 10px;
    }
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="metadata">
    <h1>${escapeHtml(content.title || "Content")}</h1>
    ${content.content_type ? `<div class="metadata-item"><strong>Type:</strong> ${escapeHtml(content.content_type)}</div>` : ""}
    ${content.created_at ? `<div class="metadata-item"><strong>Created:</strong> ${new Date(content.created_at).toLocaleString()}</div>` : ""}
    ${content.sentiment ? `<div class="metadata-item"><strong>Sentiment:</strong> ${escapeHtml(content.sentiment)}</div>` : ""}
    ${content.keywords && content.keywords.length > 0 ? `<div class="metadata-item"><strong>Keywords:</strong> ${escapeHtml(content.keywords.join(", "))}</div>` : ""}
  </div>
  <div class="content">${escapeHtml(content.content || "")}</div>
</body>
</html>
  `.trim()

  const extension = forPDF ? "html" : "html"
  const mimeType = "text/html"

  return new NextResponse(html, {
    headers: {
      "Content-Type": `${mimeType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${sanitizeFilename(content.title || "content")}.${extension}"`,
    },
  })
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .substring(0, 100)
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

