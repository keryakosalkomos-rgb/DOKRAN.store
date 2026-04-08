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

      // If order is newly cancelled, restore stock and fully delete it
      if (status === "Cancelled") {
        try {
          for (const item of orderItems) {
            if (item.product) {
              const productRef = db.collection("products").doc(item.product);
              
              await db.runTransaction(async (transaction) => {
                const pDoc = await transaction.get(productRef);
                if (pDoc.exists) {
                  const pData = pDoc.data();
                  let updateObj: any = { stock: FieldValue.increment(item.quantity) };
                  
                  // Restore specific size quantity if applicable
                  if (item.size && pData?.sizes) {
                    const newSizes = pData.sizes.map((sCol: any) => {
                       const sName = typeof sCol === 'string' ? sCol : sCol.size;
                       if (sName === item.size && typeof sCol === 'object' && sCol.quantity !== undefined && sCol.quantity !== null) {
                         return { ...sCol, quantity: sCol.quantity + item.quantity };
                       }
                       return sCol;
                    });
                    updateObj.sizes = newSizes;
                  }
                  
                  transaction.update(productRef, updateObj);
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to restore stock on cancel:", e);
        }

        // Fully delete the order document
        await docRef.delete();
        
        // Notify user about cancellation/deletion
        const userId = docSnap.data()?.user;
        if (userId) {
          sendNotificationToUser(userId, {
            title: "Order Cancelled",
            body: `Your order #${id.slice(-8).toUpperCase()} has been cancelled.`,
            data: { url: "/profile" }
          });
          try {
            await db.collection("notifications").add({
              targetUser: userId,
              title: "Order Cancelled",
              body: `Your order #${id.slice(-8).toUpperCase()} has been cancelled.`,
              url: "/profile",
              isRead: false,
              createdAt: new Date().toISOString()
            });
          } catch (err) {}
        }
        
        return NextResponse.json({ success: true, message: "Order completely deleted" });
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
