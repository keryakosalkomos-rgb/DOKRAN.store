import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: userId } = await params;
    const db = adminDb();
    
    // The messages collection has documents with conversationId = userId
    const messagesRef = db.collection("messages");
    const snapshot = await messagesRef.where("conversationId", "==", userId).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ success: true, message: "No messages to delete" });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
