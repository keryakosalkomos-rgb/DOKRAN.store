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

    // Group items by product ID to apply bulk offers correctly
    const groupedItems = orderItems.reduce((acc: any, item: any) => {
      if (!acc[item.product]) {
        acc[item.product] = {
          totalQuantity: 0,
          basePrice: item.price,
          bulkOffers: item.bulkOffers || [],
        };
      }
      acc[item.product].totalQuantity += item.quantity;
      return acc;
    }, {});

    let actualItemsPrice = 0;
    for (const productId in groupedItems) {
      const group = groupedItems[productId];
      let groupTotal = group.totalQuantity * group.basePrice;

      if (group.bulkOffers && group.bulkOffers.length > 0) {
        const sortedOffers = [...group.bulkOffers].sort((a: any, b: any) => b.quantity - a.quantity);
        for (const offer of sortedOffers) {
          if (group.totalQuantity >= offer.quantity) {
            const bundles = Math.floor(group.totalQuantity / offer.quantity);
            const remainder = group.totalQuantity % offer.quantity;
            groupTotal = (bundles * offer.price) + (remainder * group.basePrice);
            break;
          }
        }
      }
      actualItemsPrice += groupTotal;
    }

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

    // Update Product Stock & Verify Availability
    try {
      for (const item of orderItems) {
        if (item.product) {
          const productRef = db.collection("products").doc(item.product);
          await db.runTransaction(async (transaction) => {
            const pDoc = await transaction.get(productRef);
            if (!pDoc.exists) throw new Error(`Product not found: ${item.name}`);
            
            const pData = pDoc.data();
            const updateObj: any = {};
            
            // 1. Verify and Update Variants Stock
            if (item.color && item.size && pData?.variants) {
              const variant = pData.variants.find((v: any) => v.color === item.color);
              if (!variant) throw new Error(`Color ${item.color} not found for ${item.name}`);
              
              const sizeObj = variant.sizes.find((s: any) => s.size === item.size);
              if (!sizeObj) throw new Error(`Size ${item.size} not found for ${item.name}`);
              
              if (sizeObj.quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${item.name} (${item.color}/${item.size}). Available: ${sizeObj.quantity}`);
              }

              const newVariants = pData.variants.map((v: any) => {
                if (v.color === item.color) {
                  const newSizes = v.sizes.map((s: any) => {
                    if (s.size === item.size) {
                      return { ...s, quantity: (s.quantity || 0) - item.quantity };
                    }
                    return s;
                  });
                  return { ...v, sizes: newSizes };
                }
                return v;
              });
              updateObj.variants = newVariants;
              
              const newTotalStock = newVariants.reduce((acc: number, v: any) => 
                acc + v.sizes.reduce((sAcc: number, s: any) => sAcc + (Number(s.quantity) || 0), 0), 0
              );
              updateObj.stock = newTotalStock;
            } else if (pData?.stock !== undefined) {
              // Fallback for products without variants
              if (pData.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.name}. Available: ${pData.stock}`);
              }
              updateObj.stock = FieldValue.increment(-item.quantity);
            }
            
            if (Object.keys(updateObj).length > 0) {
              transaction.update(productRef, updateObj);
            }
          });
        }
      }
    } catch (err: any) {
      console.error("Stock verification failed:", err);
      // Delete the order if stock update failed (since we already added it)
      // Note: Ideally the order creation should also be inside the same transaction
      // but firestore transactions have limits. For now, we return error.
      await db.collection("orders").doc(docRef.id).delete();
      return NextResponse.json({ message: err.message || "Insufficient stock" }, { status: 400 });
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
