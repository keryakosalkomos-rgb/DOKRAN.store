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
      try {
        // Prepare Nodemailer
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // Use STARTTLS
          auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || '',
          },
          connectionTimeout: 10000, // 10 seconds timeout
        });

        // Send email
        await transporter.sendMail({
          from: `"DOKRAN" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Password Reset Request",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="font-size: 24px; font-weight: 800; text-align: center;">Password Reset Request</h1>
              <p style="color: #666; line-height: 1.6;">You requested to reset your password for your DOKRAN account. Click the button below to set a new password. This link is only valid for 1 hour.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // We still return 200/success message to the client to avoid enumeration/leaking info,
        // but we'll have a record of the failure in the logs.
      }
    }

    return NextResponse.json({ message: "If this email is registered, a reset link was sent." });

  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
