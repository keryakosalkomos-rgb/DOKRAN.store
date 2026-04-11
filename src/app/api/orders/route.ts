import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendNotificationToAdmins } from "@/lib/notifications";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { orderItems, shippingAddress, paymentMethod, totalPrice, notes, paymentProof, itemsPrice, shippingPrice } = body;

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ message: "No order items" }, { status: 400 });
    }

    const db = adminDb();
    const settingsSnap = await db.collection("settings").doc("payment").get();
    const fixedShippingPrice = settingsSnap.exists ? (Number(settingsSnap.data()?.fixedShippingPrice) || 0) : 0;

    const actualItemsPrice = orderItems.reduce((acc: any, it: any) => acc + (it.price * it.quantity), 0);
    const finalShippingPrice = shippingPrice !== undefined && shippingPrice !== 0 ? shippingPrice : fixedShippingPrice;
    const actualTotalPrice = actualItemsPrice + finalShippingPrice;

    const newOrder = {
      user: (session.user as any).id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: actualItemsPrice,
      shippingPrice: finalShippingPrice,
      totalPrice: actualTotalPrice,
      notes: notes || "",
      paymentProof: paymentProof || "",
      isPaid: false,
      isDelivered: false,
      status: "Pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("orders").add(newOrder);
    const createdOrder = { _id: docRef.id, ...newOrder };

    // Update user profile with shipping address
    try {
      const userRef = db.collection("users").doc((session.user as any).id);
      await userRef.update({
        address: shippingAddress.address,
        city: shippingAddress.city,
        country: shippingAddress.country,
        phone: shippingAddress.phone || (session.user as any).phone
      });
    } catch(err) {
      console.error("Failed to update user address:", err);
    }

    // Update Product Stock
    try {
      for (const item of orderItems) {
        if (item.product) {
          const productRef = db.collection("products").doc(item.product);
          await db.runTransaction(async (transaction) => {
            const pDoc = await transaction.get(productRef);
            if (pDoc.exists) {
              const pData = pDoc.data();
              const updateObj: any = {};
              
              // 1. Update Variants Stock
              if (item.color && item.size && pData?.variants) {
                const newVariants = pData.variants.map((v: any) => {
                  if (v.color === item.color) {
                    const newSizes = v.sizes.map((s: any) => {
                      if (s.size === item.size) {
                        return { ...s, quantity: Math.max(0, (s.quantity || 0) - item.quantity) };
                      }
                      return s;
                    });
                    return { ...v, sizes: newSizes };
                  }
                  return v;
                });
                updateObj.variants = newVariants;
                
                // Recalculate total stock from new variants
                const newTotalStock = newVariants.reduce((acc: number, v: any) => 
                  acc + v.sizes.reduce((sAcc: number, s: any) => sAcc + (Number(s.quantity) || 0), 0), 0
                );
                updateObj.stock = newTotalStock;
              } else if (pData?.stock !== undefined) {
                // Fallback for products without variants
                updateObj.stock = FieldValue.increment(-item.quantity);
              }
              
              if (Object.keys(updateObj).length > 0) {
                transaction.update(productRef, updateObj);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to decrement stock:", err);
    }

    // Insert Admin In-App Notification
    try {
      await db.collection("notifications").add({
        targetRole: "admin",
        title: "New Order Received! 🛍️",
        body: `A new order has been placed for ${totalPrice} ج.م.`,
        url: "/admin/orders",
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to create admin notification doc:", err);
    }

    // Send push notification to admins
    try {
      await sendNotificationToAdmins({
        title: "New Order Received! 🛍️",
        body: `A new order has been placed for ${totalPrice} ج.م.`,
        data: { url: "/admin/orders" },
      });

      const itemsList = orderItems.map((item: any) => `- ${item.name} (${item.quantity})`).join("\n");
      const message = `🛍️ *New Order Received!*\n\n` +
        `👤 *Customer:* ${session?.user?.name || "Guest"}\n` +
        `💰 *Total:* ${totalPrice} EGP\n` +
        `📍 *Address:* ${shippingAddress.address}, ${shippingAddress.city}\n\n` +
        `📦 *Items:*\n${itemsList}\n\n` +
        `📝 *Notes:* ${notes || "None"}\n\n` +
        `👉 View order: ${process.env.NEXTAUTH_URL}/admin/orders`;

      const { notifyAdminsViaWhatsApp } = await import("@/lib/notifications");
      await notifyAdminsViaWhatsApp(message);
    } catch (err) {
      console.error("Failed to send admin notification:", err);
    }

    return NextResponse.json(createdOrder, { status: 201 });
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ message: error.message || "Failed to create order" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const db = adminDb();
    const userId = (session.user as any).id;
    const snapshot = await db.collection("orders").where("user", "==", userId).get();

    const orders = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    // Sort in memory to avoid missing index errors
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch orders" }, { status: 500 });
  }
}
