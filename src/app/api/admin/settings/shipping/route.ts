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
    const docRef = db.collection("settings").doc("shipping");
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const defaultGovernorates = [
        { id: "cairo", name: "Cairo", nameAr: "القاهرة", price: 0 },
        { id: "alexandria", name: "Alexandria", nameAr: "الإسكندرية", price: 0 },
        { id: "giza", name: "Giza", nameAr: "الجيزة", price: 0 },
        { id: "qalyubia", name: "Qalyubia", nameAr: "القليوبية", price: 0 },
        { id: "portsaid", name: "Port Said", nameAr: "بورسعيد", price: 0 },
        { id: "suez", name: "Suez", nameAr: "السويس", price: 0 },
        { id: "gharbia", name: "Gharbia", nameAr: "الغربية", price: 0 },
        { id: "dakahlia", name: "Dakahlia", nameAr: "الدقهلية", price: 0 },
        { id: "ismailiya", name: "Ismailiya", nameAr: "الإسماعيلية", price: 0 },
        { id: "asyut", name: "Asyut", nameAr: "أسيوط", price: 0 },
        { id: "fayoum", name: "Fayoum", nameAr: "الفيوم", price: 0 },
        { id: "sharkia", name: "Sharkia", nameAr: "الشرقية", price: 0 },
        { id: "aswan", name: "Aswan", nameAr: "أسوان", price: 0 },
        { id: "beheira", name: "Beheira", nameAr: "البحيرة", price: 0 },
        { id: "minya", name: "Minya", nameAr: "المنيا", price: 0 },
        { id: "damietta", name: "Damietta", nameAr: "دمياط", price: 0 },
        { id: "luxor", name: "Luxor", nameAr: "الأقصر", price: 0 },
        { id: "qena", name: "Qena", nameAr: "قنا", price: 0 },
        { id: "benisuef", name: "Beni Suef", nameAr: "بني سويف", price: 0 },
        { id: "sohag", name: "Sohag", nameAr: "سوهاج", price: 0 },
        { id: "monufia", name: "Monufia", nameAr: "المنوفية", price: 0 },
        { id: "redsea", name: "Red Sea", nameAr: "البحر الأحمر", price: 0 },
        { id: "wadielgedid", name: "Wadi El Gedid", nameAr: "الوادي الجديد", price: 0 },
        { id: "matrouh", name: "Matrouh", nameAr: "مطروح", price: 0 },
        { id: "northsinai", name: "North Sinai", nameAr: "شمال سيناء", price: 0 },
        { id: "southsinai", name: "South Sinai", nameAr: "جنوب سيناء", price: 0 },
      ];
      await docRef.set({ governorates: defaultGovernorates });
      return NextResponse.json({ governorates: defaultGovernorates });
    }

    return NextResponse.json(docSnap.data());
  } catch (error) {
    console.error("Shipping GET error:", error);
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
    const docRef = db.collection("settings").doc("shipping");
    
    await docRef.set(data, { merge: true });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Shipping POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
