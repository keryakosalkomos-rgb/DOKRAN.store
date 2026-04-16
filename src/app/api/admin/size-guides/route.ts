import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = adminDb();
    const docRef = db.collection("settings").doc("size_guides");
    const docSnap = await docRef.get();

    let guides = [];
    if (docSnap.exists) {
      const dbData = docSnap.data() || {};
      if (dbData.data) {
        try { guides = JSON.parse(dbData.data); } catch(e) {}
      } else {
        guides = dbData.guides || [];
      }
    }
    
    return NextResponse.json(guides);
  } catch (error) {
    console.error("Size Guides GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const guides = await request.json();
    const db = adminDb();
    const docRef = db.collection("settings").doc("size_guides");
    
    await docRef.set({ data: JSON.stringify(guides) });

    return NextResponse.json({ success: true, guides });
  } catch (error) {
    console.error("Size Guides POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
