import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Blog API is working!",
    timestamp: new Date().toISOString(),
  })
}

export async function POST() {
  return NextResponse.json({
    message: "Blog POST API is working!",
    timestamp: new Date().toISOString(),
  })
}
