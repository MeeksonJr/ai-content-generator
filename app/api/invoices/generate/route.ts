import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * Generate invoice PDF for a payment
 * This is a simplified version - in production, you'd use a PDF library like pdfkit or puppeteer
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
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from("payment_history")
      .select("*")
      .eq("transaction_id", paymentId)
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (paymentError || !payment) {
      // Try to get from subscriptions if not in payment_history
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!subscription) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      // Generate invoice from subscription data
      const invoiceData = {
        invoiceId: `INV-${paymentId.substring(0, 8).toUpperCase()}`,
        date: new Date().toISOString(),
        amount: getPlanPrice(subscription.plan_type),
        currency: "USD",
        description: `${subscription.plan_type} Subscription`,
        planType: subscription.plan_type,
        userEmail: session.user.email,
      }

      // Generate simple HTML invoice (in production, use PDF library)
      const invoiceHtml = generateInvoiceHTML(invoiceData)

      return new NextResponse(invoiceHtml, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="invoice-${invoiceData.invoiceId}.html"`,
        },
      })
    }

    // Generate invoice from payment data
    const invoiceData = {
      invoiceId: payment.invoice_id || `INV-${paymentId.substring(0, 8).toUpperCase()}`,
      date: payment.created_at,
      amount: parseFloat(payment.amount),
      currency: payment.currency || "USD",
      description: payment.description || "Subscription payment",
      planType: null,
      userEmail: session.user.email,
    }

    const invoiceHtml = generateInvoiceHTML(invoiceData)

    return new NextResponse(invoiceHtml, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="invoice-${invoiceData.invoiceId}.html"`,
      },
    })
  } catch (error) {
    logger.error("Error generating invoice", {
      context: "InvoiceGeneration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Invoice Generation")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

function getPlanPrice(planType: string | null): number {
  const prices: Record<string, number> = {
    professional: 29.99,
    enterprise: 99.99,
    basic: 9.99,
  }
  return prices[planType || "free"] || 0
}

function generateInvoiceHTML(data: {
  invoiceId: string
  date: string
  amount: number
  currency: string
  description: string
  planType: string | null
  userEmail: string | null
}): string {
  const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceId}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .invoice-id {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .billing-info {
      flex: 1;
    }
    .invoice-info {
      flex: 1;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .total {
      text-align: right;
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-id">Invoice ${data.invoiceId}</div>
    <div>AI Content Generator</div>
  </div>

  <div class="details">
    <div class="billing-info">
      <h3>Bill To:</h3>
      <p>${data.userEmail || "Customer"}</p>
    </div>
    <div class="invoice-info">
      <p><strong>Invoice Date:</strong> ${formattedDate}</p>
      <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${data.description}</td>
        <td>${data.currency} ${data.amount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    <p>Total: ${data.currency} ${data.amount.toFixed(2)}</p>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This is an automated invoice. For questions, please contact support.</p>
  </div>
</body>
</html>
  `.trim()
}

