import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = adminDb();
    const docRef = db.collection("settings").doc("payment");
    const docSnap = await docRef.get();

    let settings;
    if (!docSnap.exists) {
      settings = {
        instaPayNumber: "",
        mobileWalletNumber: "",
        bankAccountDetails: "",
        isActive: true,
        adminWhatsAppNumber: "",
        whatsAppNotificationsEnabled: false,
        heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000",
        homeCollections: [
          { id: "1", title: "Men", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800", link: "/products?category=men" },
          { id: "2", title: "Women", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", link: "/products?category=women" }
        ],
      };
      await docRef.set(settings);
    } else {
      settings = docSnap.data();
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const db = adminDb();
    const docRef = db.collection("settings").doc("payment");
    
    await docRef.set(data, { merge: true });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
