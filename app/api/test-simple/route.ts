import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({
      message: "API is working correctly",
      timestamp: new Date().toISOString(),
      status: "success",
    })
  } catch (error) {
    return NextResponse.json({ error: "API test failed" }, { status: 500 })
  }
}

export async function POST() {
  try {
    return NextResponse.json({
      message: "POST method working correctly",
      timestamp: new Date().toISOString(),
      status: "success",
    })
  } catch (error) {
    return NextResponse.json({ error: "API POST test failed" }, { status: 500 })
  }
}
