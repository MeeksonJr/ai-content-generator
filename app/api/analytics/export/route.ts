import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/analytics/export
 * Export analytics data in various formats (CSV, PDF, Excel)
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
    const format = searchParams.get("format") || "csv"
    const dataType = searchParams.get("type") || "all"

    // Fetch analytics data
    const subscriptionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/subscription`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    })

    if (!subscriptionResponse.ok) {
      throw new Error("Failed to fetch subscription data")
    }

    const subscriptionData = await subscriptionResponse.json()

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
    let exportData: any = {}

    if (dataType === "all" || dataType === "summary") {
      exportData.summary = {
        totalContent: contentData?.length || 0,
        totalUsage: subscriptionData.usageStats?.content_generated || 0,
        apiCalls: subscriptionData.usageStats?.api_calls || 0,
        sentimentAnalysis: subscriptionData.usageStats?.sentiment_analysis_used || 0,
        keywordExtraction: subscriptionData.usageStats?.keyword_extraction_used || 0,
        textSummarization: subscriptionData.usageStats?.text_summarization_used || 0,
      }
    }

    if (dataType === "all" || dataType === "content") {
      exportData.content = contentData || []
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
        return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 })
    }
  } catch (error) {
    logger.error("Error exporting analytics data", {
      context: "AnalyticsExport",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Analytics Export")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

function generateCSV(data: any, dataType: string) {
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
    data.content.forEach((item: any) => {
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

function generateJSON(data: any) {
  return NextResponse.json(data, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}

function generatePDF(data: any, dataType: string) {
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
        ${data.content.map((item: any) => `
          <tr>
            <td>${item.title || "N/A"}</td>
            <td>${item.content_type || "N/A"}</td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
            <td>${item.sentiment || "N/A"}</td>
          </tr>
        `).join("")}
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

