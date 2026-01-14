import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError } from "@/lib/utils/error-handler"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import type { ExportData, ExportContentItem, ExportDataSummary } from "@/lib/types/api.types"
import type { UsageStatsRow, UsageLimitRow } from "@/lib/types/dashboard.types"

/**
 * GET /api/analytics/export
 * Export analytics data in various formats (CSV, PDF, Excel)
 */
export async function GET(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Analytics Export GET")
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"
    const dataType = searchParams.get("type") || "all"

    // Validate format
    const validFormats = ["csv", "json", "pdf"]
    if (!validFormats.includes(format.toLowerCase())) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Invalid format. Must be one of: ${validFormats.join(", ")}`),
        "Analytics Export GET"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate dataType
    const validDataTypes = ["all", "summary", "content", "usage"]
    if (!validDataTypes.includes(dataType.toLowerCase())) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Invalid data type. Must be one of: ${validDataTypes.join(", ")}`),
        "Analytics Export GET"
      )
      return createSecureResponse(error, statusCode)
    }

    // Fetch analytics data
    const subscriptionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/subscription`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    })

    if (!subscriptionResponse.ok) {
      throw new Error("Failed to fetch subscription data")
    }

    const subscriptionData = (await subscriptionResponse.json()) as {
      usageStats?: UsageStatsRow
      usageLimits?: UsageLimitRow
    }

    // Fetch content data
    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .select("id, content_type, sentiment, created_at, keywords, title")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (contentError) {
      throw contentError
    }

    // Process data based on type
    const exportData: ExportData = {}

    if (dataType === "all" || dataType === "summary") {
      const summary: ExportDataSummary = {
        totalContent: contentData?.length || 0,
        totalUsage: (subscriptionData.usageStats as UsageStatsRow)?.content_generated || 0,
        apiCalls: (subscriptionData.usageStats as UsageStatsRow)?.api_calls || 0,
        sentimentAnalysis: (subscriptionData.usageStats as UsageStatsRow)?.sentiment_analysis_used || 0,
        keywordExtraction: (subscriptionData.usageStats as UsageStatsRow)?.keyword_extraction_used || 0,
        textSummarization: (subscriptionData.usageStats as UsageStatsRow)?.text_summarization_used || 0,
      }
      exportData.summary = summary
    }

    if (dataType === "all" || dataType === "content") {
      exportData.content = (contentData || []) as ExportContentItem[]
    }

    if (dataType === "all" || dataType === "usage") {
      exportData.usage = {
        current: subscriptionData.usageStats || {},
        limits: subscriptionData.usageLimits || {},
      }
    }

    // Generate export based on format
    switch (format.toLowerCase()) {
      case "csv":
        return generateCSV(exportData, dataType)
      case "json":
        return generateJSON(exportData)
      case "pdf":
        return generatePDF(exportData, dataType)
      default:
        const { statusCode, error } = handleApiError(
          new ValidationError(`Unsupported format: ${format}`),
          "Analytics Export GET"
        )
        return createSecureResponse(error, statusCode)
    }
  } catch (error) {
    logger.error("Error exporting analytics data", {
      context: "AnalyticsExport",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Analytics Export")
    return createSecureResponse(apiError, statusCode)
  }
}

function generateCSV(data: ExportData, dataType: string) {
  let csvContent = ""

  if (data.summary) {
    csvContent += "Analytics Summary\n"
    csvContent += "Metric,Value\n"
    csvContent += `Total Content,${data.summary.totalContent}\n`
    csvContent += `Total Usage,${data.summary.totalUsage}\n`
    csvContent += `API Calls,${data.summary.apiCalls}\n`
    csvContent += `Sentiment Analysis,${data.summary.sentimentAnalysis}\n`
    csvContent += `Keyword Extraction,${data.summary.keywordExtraction}\n`
    csvContent += `Text Summarization,${data.summary.textSummarization}\n\n`
  }

  if (data.content && data.content.length > 0) {
    csvContent += "Content Details\n"
    csvContent += "ID,Title,Type,Created At,Sentiment,Keywords\n"
    data.content.forEach((item) => {
      const keywords = Array.isArray(item.keywords) ? item.keywords.join("; ") : ""
      csvContent += `${item.id},"${item.title || ""}","${item.content_type || ""}","${item.created_at || ""}","${item.sentiment || ""}","${keywords}"\n`
    })
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}

function generateJSON(data: ExportData) {
  return NextResponse.json(data, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}

function generatePDF(data: ExportData, dataType: string) {
  // Generate HTML that can be printed to PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analytics Export</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    h1 { color: #2563eb; }
    h2 { color: #1e40af; margin-top: 20px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .summary {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .metric {
      display: inline-block;
      margin-right: 20px;
      margin-bottom: 10px;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
  </style>
</head>
<body>
  <h1>Analytics Export</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  ${data.summary ? `
    <div class="summary">
      <h2>Summary</h2>
      <div class="metric">
        <div class="metric-label">Total Content</div>
        <div class="metric-value">${data.summary.totalContent}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Usage</div>
        <div class="metric-value">${data.summary.totalUsage}</div>
      </div>
      <div class="metric">
        <div class="metric-label">API Calls</div>
        <div class="metric-value">${data.summary.apiCalls}</div>
      </div>
    </div>
  ` : ""}
  
  ${data.content && data.content.length > 0 ? `
    <h2>Content Details</h2>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Created At</th>
          <th>Sentiment</th>
        </tr>
      </thead>
      <tbody>
        ${data.content?.map((item) => `
          <tr>
            <td>${item.title || "N/A"}</td>
            <td>${item.content_type || "N/A"}</td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
            <td>${item.sentiment || "N/A"}</td>
          </tr>
        `).join("") || ""}
      </tbody>
    </table>
  ` : ""}
</body>
</html>
  `

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-export-${new Date().toISOString().split("T")[0]}.html"`,
    },
  })
}

