import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendNotificationToUser } from "@/lib/notifications";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status, shippingPrice } = await request.json();

    const db = adminDb();
    const docRef = db.collection("orders").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date().toISOString() };

    if (status) {
      const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const previousStatus = docSnap.data()?.status;
      const orderItems = docSnap.data()?.orderItems || [];

      // If order is newly cancelled, restore stock
      if (status === "Cancelled" && previousStatus !== "Cancelled") {
        try {
          const batch = db.batch();
          for (const item of orderItems) {
            if (item.product) {
              const productRef = db.collection("products").doc(item.product);
              batch.update(productRef, { stock: FieldValue.increment(item.quantity) });
            }
          }
          await batch.commit();
        } catch (e) {
          console.error("Failed to restore stock on cancel:", e);
        }
      }

      // If order is uncancelled, deduct stock again
      if (status !== "Cancelled" && previousStatus === "Cancelled") {
        try {
          const batch = db.batch();
          for (const item of orderItems) {
            if (item.product) {
              const productRef = db.collection("products").doc(item.product);
              batch.update(productRef, { stock: FieldValue.increment(-item.quantity) });
            }
          }
          await batch.commit();
        } catch (e) {
          console.error("Failed to deduct stock on uncancel:", e);
        }
      }

      updateData.status = status;
    }

    if (shippingPrice !== undefined) {
      const itemsPrice = docSnap.data()?.itemsPrice || docSnap.data()?.totalPrice || 0;
      updateData.shippingPrice = Number(shippingPrice);
      updateData.totalPrice = itemsPrice + Number(shippingPrice);
    }

    await docRef.update(updateData);
    const updatedOrder = { _id: id, ...docSnap.data(), ...updateData };

    const userId = docSnap.data()?.user;
    if (userId && status) {
      // Send Firebase FCM Notification (if token exists)
      sendNotificationToUser(userId, {
        title: "Order Status Updated",
        body: `Your order status is now: ${status}`,
        data: { url: "/profile" }
      });
      // Also update the database notifications collection mapping so user sees bell immediately
      try {
        await db.collection("notifications").add({
          targetUser: userId,
          title: "Order Status Updated",
          body: `Your order status is now: ${status}`,
          url: "/profile",
          isRead: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to add user notification doc:", err);
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
