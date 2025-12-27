import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"

/**
 * Generate invoice PDF for a payment
 * This is a simplified version - in production, you'd use a PDF library like pdfkit or puppeteer
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
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Invoice Generation GET")
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    // Validate payment ID
    if (!paymentId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Payment ID is required"),
        "Invoice Generation GET"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate payment ID format (could be UUID or transaction ID)
    const paymentIdValidation = validateText(paymentId, { minLength: 1, maxLength: 255 })
    if (!paymentIdValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(paymentIdValidation.error || "Invalid payment ID format"),
        "Invoice Generation GET"
      )
      return createSecureResponse(error, statusCode)
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
        const { statusCode, error } = handleApiError(
          new NotFoundError("Payment not found"),
          "Invoice Generation GET"
        )
        return createSecureResponse(error, statusCode)
      }

      const subscriptionData = subscription as { plan_type?: string | null }
      const planType = subscriptionData.plan_type || null

      // Generate invoice from subscription data
      const invoiceData = {
        invoiceId: `INV-${paymentId.substring(0, 8).toUpperCase()}`,
        date: new Date().toISOString(),
        amount: getPlanPrice(planType),
        currency: "USD",
        description: `${planType || "Free"} Subscription`,
        planType: planType,
        userEmail: session.user.email || null,
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
    const paymentData = payment as {
      invoice_id?: string
      created_at?: string
      amount?: string | number
      currency?: string
      description?: string
    }

    const invoiceData = {
      invoiceId: paymentData.invoice_id || `INV-${paymentId.substring(0, 8).toUpperCase()}`,
      date: paymentData.created_at || new Date().toISOString(),
      amount: typeof paymentData.amount === "string" ? parseFloat(paymentData.amount) : (paymentData.amount || 0),
      currency: paymentData.currency || "USD",
      description: paymentData.description || "Subscription payment",
      planType: null,
      userEmail: session.user.email || null,
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
    return createSecureResponse(apiError, statusCode)
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

