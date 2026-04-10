import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = adminDb();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      // Return 200 to prevent email enumeration, or return an error depending on security preference.
      return NextResponse.json({ message: "If this email is registered, a reset link was sent." });
    }

    const userDocRef = snapshot.docs[0].ref;
    
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to DB
    await userDocRef.update({
      resetToken: token,
      resetTokenExpiry: tokenExpiry.toISOString()
    });

    // Create the reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // We will log it here so it works for testing even without SMTP configured!
    console.log("=========================================");
    console.log("PASSWORD RESET LINK (Test Mode):");
    console.log(resetUrl);
    console.log("=========================================");

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Prepare Nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Standard gmail auth
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASS || '',
        },
      });

      // Send email
      await transporter.sendMail({
        from: `"DOKRAN" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset Request",
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the link below to reset it. This link is valid for 1 hour.</p>
          <br/>
          <a href="${resetUrl}" style="padding: 10px 20px; background-color: black; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <br/><br/>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    }

    return NextResponse.json({ message: "If this email is registered, a reset link was sent." });

  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
