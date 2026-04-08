"use client";

import { useState, useEffect } from "react";
import { CreditCard, Package, Loader2, ImageIcon, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Order {
  _id: string;
  createdAt: string;
  totalPrice: number;
  paymentMethod: string;
  status: string;
  paymentProof?: string;
  itemsPrice: number;
  shippingPrice: number;
  user?: { name: string; email: string };
}

export default function AdminOrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const tabs = [
    { key: "All", label: t("admin.tabAll") },
    { key: "Pending", label: t("admin.tabPending") },
    { key: "Processing", label: t("admin.tabProcessing") },
    { key: "Shipped", label: t("admin.tabShipped") },
    { key: "Delivered", label: t("admin.tabDelivered") },
    { key: "Cancelled", label: t("admin.tabCancelled") },
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?t=" + new Date().getTime());
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === "Cancelled") {
          setOrders(prev => prev.filter(o => o._id !== orderId));
        } else {
          setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
        }
      }
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShippingUpdate = async (orderId: string, newShipping: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingPrice: Number(newShipping) || 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...data.order } : o));
      }
    } catch (e) {
      console.error("Failed to update shipping", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = activeTab === "All" ? orders : orders.filter(o => o.status === activeTab);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">{t("admin.manageOrders")}</h1>
      
      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 border-b border-neutral-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.key 
                ? "bg-neutral-100 text-black border-b-2 border-black" 
                : "text-neutral-500 hover:text-black hover:bg-neutral-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" /></div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50">
              <tr className="border-b text-neutral-500">
                <th className="p-4 font-medium">{t("admin.orderId")}</th>
                <th className="p-4 font-medium">{t("admin.date")}</th>
                <th className="p-4 font-medium">{t("admin.customer")}</th>
                <th className="p-4 font-medium">{t("admin.shippingFee") || "Shipping"}</th>
                <th className="p-4 font-medium">{t("admin.total")}</th>
                <th className="p-4 font-medium">{t("admin.payment")}</th>
                <th className="p-4 font-medium">{t("admin.status")}</th>
                <th className="p-4 font-medium text-right">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id} className="border-b last:border-0 hover:bg-neutral-50 transition-colors">
                  <td className="p-4 font-mono text-xs">{order._id.slice(-8).toUpperCase()}</td>
                  <td className="p-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <p className="font-medium text-neutral-900">{order.user?.name || t("admin.unknown")}</p>
                    <p className="text-xs text-neutral-500">{order.user?.email || ""}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <input 
                         type="number"
                         min="0"
                         defaultValue={order.shippingPrice || 0}
                         onBlur={(e) => {
                           if (Number(e.target.value) !== (order.shippingPrice || 0)) {
                             handleShippingUpdate(order._id, e.target.value);
                           }
                         }}
                         className="w-16 border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-black"
                       />
                       <span className="text-xs text-neutral-500">{t("common.currency")}</span>
                    </div>
                  </td>
                  <td className="p-4 font-medium">{order.totalPrice.toFixed(2)} {t("common.currency")}</td>
                  <td className="p-4">
                     <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 font-medium"><CreditCard className="w-3 h-3 text-neutral-400"/> {order.paymentMethod}</span>
                        {order.paymentProof ? (
                          <a 
                            href={order.paymentProof} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 hover:bg-green-100 transition-colors w-fit font-bold flex items-center gap-1"
                          >
                            <ImageIcon className="w-2 h-2" /> {t("admin.viewProof") || "View Proof"}
                          </a>
                        ) : order.paymentMethod !== "Credit/Debit Card" && (
                          <span className="text-[10px] text-neutral-400 italic">No proof uploaded</span>
                        )}
                     </div>
                  </td>
                  <td className="p-4">
                     {updatingId === order._id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                     ) : (
                       <select 
                         value={order.status}
                         onChange={(e) => handleStatusChange(order._id, e.target.value)}
                         className="bg-transparent border rounded p-1 text-xs outline-none focus:ring-1 focus:ring-black cursor-pointer"
                       >
                          <option value="Pending">{t("admin.tabPending")}</option>
                          <option value="Processing">{t("admin.tabProcessing")}</option>
                          <option value="Shipped">{t("admin.tabShipped")}</option>
                          <option value="Delivered">{t("admin.tabDelivered")}</option>
                          <option value="Cancelled">{t("admin.tabCancelled")}</option>
                       </select>
                     )}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSelectedOrder(order)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">{t("admin.viewDetails")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mb-3 opacity-20 mx-auto" />
            <p>{t("admin.noOrdersFound")}</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] flex flex-col pt-10">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 bg-neutral-100 rounded-full p-2 text-neutral-500 hover:text-black hover:bg-neutral-200 transition-all z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl font-bold mb-6">{t("admin.orderDetails") || "Order Details"} - #{selectedOrder._id.slice(-8).toUpperCase()}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <h3 className="font-bold border-b pb-2 mb-3">Customer Information</h3>
                  <p className="text-sm mb-1"><strong>Name:</strong> {selectedOrder.user?.name || "Unknown"}</p>
                  <p className="text-sm mb-1"><strong>Email:</strong> {selectedOrder.user?.email || "Unknown"}</p>
                  <p className="text-sm"><strong>Phone:</strong> {(selectedOrder as any).shippingAddress?.phone || "N/A"}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <h3 className="font-bold border-b pb-2 mb-3">Shipping Address</h3>
                  <p className="text-sm mb-1">{(selectedOrder as any).shippingAddress?.address || "N/A"}</p>
                  <p className="text-sm mb-1">{(selectedOrder as any).shippingAddress?.city || ""}, {(selectedOrder as any).shippingAddress?.country || ""}</p>
                  <p className="text-sm">{(selectedOrder as any).shippingAddress?.postalCode || ""}</p>
                </div>
              </div>

              <h3 className="font-bold border-b pb-2 mb-3">Order Items</h3>
              <div className="space-y-4 mb-8">
                {((selectedOrder as any).orderItems || (selectedOrder as any).items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 border border-neutral-100 p-4 rounded-xl hover:bg-neutral-50 transition-colors">
                    <div className="w-16 h-16 overflow-hidden rounded-lg bg-neutral-100 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setExpandedImage(item.image)}>
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{item.name}</p>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        {item.size && <span className="bg-white border rounded px-2 py-1 flex items-center h-fit">Size: <span className="font-semibold text-neutral-800 ml-1">{item.size}</span></span>}
                        {item.color && (
                          <span className="bg-white border rounded px-2 py-1 flex items-center gap-1.5 h-fit">
                            Color: 
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-inner block" 
                              style={{ backgroundColor: item.color }}
                              title={item.color}
                            ></span>
                            {typeof item.color === 'string' && !item.color.startsWith("#") && (
                              <span className="font-semibold text-neutral-800 uppercase text-[10px]">{item.color}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{item.price} &times; {item.quantity}</p>
                      <p className="font-black mt-1">{(item.price * item.quantity).toFixed(2)} {t("common.currency")}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="flex justify-between text-neutral-600"><span>Subtotal:</span> <span className="font-semibold text-black">{selectedOrder.itemsPrice?.toFixed(2) || "0.00"} {t("common.currency")}</span></div>
                  <div className="flex justify-between text-neutral-600"><span>Shipping:</span> <span className="font-semibold text-black">{selectedOrder.shippingPrice?.toFixed(2) || "0.00"} {t("common.currency")}</span></div>
                  <div className="border-t pt-2 flex justify-between text-lg mt-2">
                    <span className="font-bold">Total:</span> 
                    <span className="font-black text-indigo-600">{selectedOrder.totalPrice?.toFixed(2) || "0.00"} {t("common.currency")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {expandedImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setExpandedImage(null)}>
          <button onClick={() => setExpandedImage(null)} className="absolute top-4 right-4 bg-white/10 rounded-full p-2 text-white hover:bg-white/20 transition-all z-[70]">
            <X className="w-5 h-5" />
          </button>
          <img src={expandedImage} alt="Expanded view" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
