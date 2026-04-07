import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const db = adminDb();
    const docSnap = await db.collection("settings").doc("payment").get();

    if (!docSnap.exists) {
      return NextResponse.json({
        heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000",
        homeCollections: [
          { id: "1", title: "Men's Collection", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800", link: "/products?category=men" },
          { id: "2", title: "Women's Collection", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", link: "/products?category=women" }
        ],
      });
    }

    const data = docSnap.data() || {};
    return NextResponse.json({
      heroImage: data.heroImage || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000",
      homeCollections: data.homeCollections || [
        { id: "1", title: "Men's Collection", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800", link: "/products?category=men" },
        { id: "2", title: "Women's Collection", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", link: "/products?category=women" }
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
