import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = adminDb();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Invalid token or email" }, { status: 400 });
    }

    const userDocRef = snapshot.docs[0].ref;
    const userData = snapshot.docs[0].data();

    if (userData.resetToken !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const expiryTime = new Date(userData.resetTokenExpiry);
    if (new Date() > expiryTime) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and clear tokens
    await userDocRef.update({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    return NextResponse.json({ message: "Password updated successfully" });

  } catch (error: any) {
    console.error("Reset password API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
