import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPass: !!process.env.EMAIL_PASS,
    emailUser: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.slice(0, 3)}...` : "Missing",
    nextAuthUrl: process.env.NEXTAUTH_URL || "Not Set",
  });
}
