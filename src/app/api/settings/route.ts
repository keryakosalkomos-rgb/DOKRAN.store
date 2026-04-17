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
        contactWhatsApp: "https://wa.me/201210275442",
        contactPhone: "01069478867",
        contactFacebook: "https://www.facebook.com/share/17Wnvqb4Se/",
        contactTikTok: "https://www.tiktok.com/@dokran.wears?_r=1&_t=ZS-95c6O0sdkD2",
      });
    }

    const data = docSnap.data() || {};
    return NextResponse.json({
      heroImage: data.heroImage || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000",
      homeCollections: data.homeCollections || [
        { id: "1", title: "Men's Collection", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800", link: "/products?category=men" },
        { id: "2", title: "Women's Collection", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", link: "/products?category=women" }
      ],
      contactWhatsApp: data.contactWhatsApp || "https://wa.me/201210275442",
      contactPhone: data.contactPhone || "01069478867",
      contactFacebook: data.contactFacebook || "https://www.facebook.com/share/17Wnvqb4Se/",
      contactTikTok: data.contactTikTok || "https://www.tiktok.com/@dokran.wears?_r=1&_t=ZS-95c6O0sdkD2",
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
