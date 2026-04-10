import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const emailUser = process.env.EMAIL_USER || "";
  const emailPass = process.env.EMAIL_PASS || "";

  let sendResult = "Not attempted";
  let errorDetail = null;

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"DOKRAN Test" <${emailUser}>`,
      to: emailUser, // Send to yourself
      subject: "DOKRAN SMTP TEST",
      text: "This is a test email to verify your SMTP settings.",
    });
    sendResult = "Success! Email sent.";
  } catch (err: any) {
    sendResult = "Failed";
    errorDetail = err.message || JSON.stringify(err);
  }

  return NextResponse.json({
    hasEmailUser: !!emailUser,
    hasEmailPass: !!emailPass,
    emailUser: emailUser ? `${emailUser.slice(0, 3)}...` : "Missing",
    nextAuthUrl: process.env.NEXTAUTH_URL || "Not Set",
    sendResult,
    errorDetail
  });
}
