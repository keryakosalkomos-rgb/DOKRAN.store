import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const db = adminDb();
    
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    
    return NextResponse.json({
      user: {
        id: userId,
        name: userData?.name || session.user.name,
        email: userData?.email || session.user.email,
        phone: userData?.phone || "",
        address: userData?.address || "",
        city: userData?.city || "",
        country: userData?.country || "",
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ message: "Failed to fetch profile" }, { status: 500 });
  }
}
