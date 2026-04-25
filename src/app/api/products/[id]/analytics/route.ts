import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type } = body; // "visit" or "attempt"

    if (!type || (type !== "visit" && type !== "attempt")) {
      return NextResponse.json({ message: "Invalid analytics type" }, { status: 400 });
    }

    const db = adminDb();
    
    // First find the product. It could be by ID or slug
    let productRef = db.collection("products").doc(id);
    let productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      // Find by slug
      const slugDocs = await db.collection("products").where("slug", "==", id).limit(1).get();
      if (!slugDocs.empty) {
        productRef = slugDocs.docs[0].ref;
        productDoc = slugDocs.docs[0];
      } else {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
    }

    if (type === "visit") {
      await productRef.update({
        visits: FieldValue.increment(1)
      });
    } else if (type === "attempt") {
      await productRef.update({
        outOfStockAttempts: FieldValue.increment(1)
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating product analytics:", error);
    return NextResponse.json({ message: "Failed to update analytics" }, { status: 500 });
  }
}
