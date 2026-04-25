"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { CheckCircle2, Loader2, Upload, ImageIcon, CheckCircle, Info } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const router = useRouter();
  const { items, cartTotal, cartSubtotal, clearCart } = useCartStore();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [paymentProof, setPaymentProof] = useState("");
  
  const [platformSettings, setPlatformSettings] = useState({
    instaPayNumber: "",
    mobileWalletNumber: "",
    bankAccountDetails: "",
  });
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [shippingPrice, setShippingPrice] = useState(0);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
    paymentMethod: "Cash on Delivery",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.href));
      return;
    }
    
    if (session) {
      fetch("/api/user/profile")
        .then(res => {
          if (!res.ok) throw new Error("Profile not found");
          return res.json();
        })
        .then(data => {
          if (data.user) {
            setFormData(prev => ({
              ...prev,
              fullName: data.user.name || prev.fullName,
              phone: data.user.phone || prev.phone,
              address: data.user.address || prev.address,
              city: data.user.city || prev.city
            }));
          }
        })
        .catch(console.error);
    }
  }, [session, status]);

  // Effect to handle shipping price calculation when city or governorates list changes
  useEffect(() => {
    if (formData.city && governorates.length > 0) {
      const gov = governorates.find(g => g.name === formData.city || g.nameAr === formData.city || g.id === formData.city);
      if (gov) {
        setShippingPrice(gov.price);
      }
    }
  }, [formData.city, governorates]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPlatformSettings({
            instaPayNumber: data.instaPayNumber || "",
            mobileWalletNumber: data.mobileWalletNumber || "",
            bankAccountDetails: data.bankAccountDetails || "",
          });
        }
      })
      .catch(console.error);

    fetch("/api/admin/settings/shipping")
      .then(res => res.json())
      .then(data => {
        if (data.governorates) {
          setGovernorates(data.governorates);
        }
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setPaymentProof(data.secure_url);
      } else {
        alert("Upload failed. Please try again.");
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };



  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === "city") {
      const gov = governorates.find(g => g.name === value || g.nameAr === value || g.id === value);
      if (gov) {
        setShippingPrice(gov.price);
      }
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    if (["InstaPay", "Mobile Wallet", "Bank Transfer"].includes(formData.paymentMethod) && !paymentProof) {
      alert(t("checkout.proofRequired") || "Please upload payment proof (screenshot) first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const standardItems = items.filter(item => !item.product.startsWith("custom-"));
      const customItems = items.filter(item => item.product.startsWith("custom-"));

      const shippingAddress = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        country: "Egypt", // Defaulting to Egypt
      };

      // 1. Process Standard Order
      if (standardItems.length > 0) {
        const itemsPrice = standardItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const finalTotal = itemsPrice + shippingPrice;

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderItems: standardItems,
            shippingAddress,
            paymentMethod: formData.paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice: finalTotal,
            notes: formData.notes,
            paymentProof,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to place standard order");
        }
      }

      // 2. Process Custom Orders
      for (const item of customItems) {
        if (!item.customDesign) continue;
        const res = await fetch("/api/orders/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item.customDesign,
            quantity: item.quantity,
            notes: formData.notes,
            shippingAddress,
            totalPrice: item.price * item.quantity,
            status: "Pending",
            paymentProof,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to place custom order");
        }
      }

      setOrderComplete(true);
      clearCart();
    } catch (error: any) {
      alert(error.message || "An error occurred during checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (items.length === 0 && !orderComplete) {
      router.push("/cart");
    }
  }, [items.length, orderComplete, router]);

  if (items.length === 0 && !orderComplete) {
    return null;
  }

  if (orderComplete) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t("checkout.success")}</h1>
        <p className="text-neutral-500 max-w-md mx-auto mb-8">{t("checkout.successDesc")}</p>
        <Link href="/" className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors">
          {t("checkout.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 border-t pt-8">
        {/* Left Col: Form */}
        <div className="lg:col-span-7">
          <h2 className="text-2xl font-bold tracking-tight mb-8">{t("checkout.details")}</h2>
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">{t("custom.fullName")}</label>
                <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("custom.phone")}</label>
                <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("custom.address")}</label>
              <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-black" />
            </div>

            <div className="grid grid-cols-1 gap-6">
               <div>
                <label className="block text-sm font-medium mb-1">{t("custom.city")}</label>
                <select 
                  required 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  className="w-full border rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="">{t("checkout.selectGovernorate")}</option>
                  {governorates.map(gov => (
                    <option key={gov.id} value={gov.name}>
                      {isRTL ? gov.nameAr : gov.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("checkout.notes")}</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full border rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-black h-24 resize-none" />
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-lg font-bold mb-4">{t("checkout.payment")}</h3>
              <div className="space-y-4">
                {[
                  { name: "InstaPay", logos: ["/images/payments/instapay.png"] },
                  { name: "Mobile Wallet", logos: ["/images/payments/vodafone.png"] },
                  { name: "Bank Transfer", logos: [] },
                  { name: "Credit/Debit Card", logos: ["/images/payments/visa.png", "/images/payments/mastercard.png"] },
                  { name: "Cash on Delivery", logos: ["/images/payments/cod.png"] }
                ].map((item) => (
                  <label key={item.name} className={`flex items-center justify-between border p-4 rounded-xl cursor-pointer hover:bg-neutral-50 transition-all ${formData.paymentMethod === item.name ? "border-black bg-neutral-50 ring-1 ring-black" : "border-neutral-200"}`}>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value={item.name} 
                        checked={formData.paymentMethod === item.name}
                        onChange={handleChange}
                        className="w-4 h-4 text-black focus:ring-black accent-black" 
                      />
                      <span className="font-bold text-sm">
                        {item.name === "InstaPay" ? "InstaPay" : 
                         item.name === "Mobile Wallet" ? "Mobile Wallet" : 
                         item.name === "Bank Transfer" ? "Bank Transfer" : 
                         item.name === "Cash on Delivery" ? (t("checkout.cod") || "Cash on Delivery") : 
                         "Credit/Debit Card"}
                      </span>
                    </div>
                    {item.logos.length > 0 && (
                      <div className="flex -space-x-2 overflow-hidden">
                        {item.logos.map((logo, idx) => (
                          <img 
                            key={idx} 
                            src={logo} 
                            alt="" 
                            className="w-8 h-8 rounded-full border-2 border-white object-contain bg-white shadow-sm" 
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ))}
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {["InstaPay", "Mobile Wallet", "Bank Transfer"].includes(formData.paymentMethod) && (
                <div className="mt-6 p-6 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-neutral-900 mb-1">
                        {formData.paymentMethod === "InstaPay" ? "InstaPay Details" : 
                         formData.paymentMethod === "Mobile Wallet" ? "Wallet Details" : "Bank Details"}
                      </p>
                      <p className="text-sm text-neutral-600 font-mono bg-white p-3 rounded-xl border border-neutral-100">
                        {formData.paymentMethod === "InstaPay" ? platformSettings.instaPayNumber : 
                         formData.paymentMethod === "Mobile Wallet" ? platformSettings.mobileWalletNumber : 
                         platformSettings.bankAccountDetails}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-200">
                    <p className="text-sm font-bold mb-3">{t("checkout.uploadProof") || "Upload Payment Screenshot"}</p>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={uploading}
                      />
                      <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${paymentProof ? "border-green-500 bg-green-50" : "border-neutral-200 hover:border-black bg-white"}`}>
                        {uploading ? (
                          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                        ) : paymentProof ? (
                          <>
                            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                            <p className="text-sm font-bold text-green-700">{t("checkout.proofUploaded")}</p>
                            <img src={paymentProof} className="w-20 h-20 object-cover rounded mt-2 border" alt="Proof" />
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-neutral-300 mb-2" />
                            <p className="text-sm font-medium text-neutral-500 text-center">
                              {t("checkout.uploadHint") || "Click to upload your transfer screenshot"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === "Cash on Delivery" && (
                <div className="mt-6 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-indigo-900 leading-relaxed">
                      {t("checkout.codInstruction")}
                    </p>
                </div>
              )}

              {formData.paymentMethod === "Credit/Debit Card" && (
                <div className="mt-6 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-amber-800">
                    Online payment is currently processing manually. Please choose another method for faster processing or contact us after ordering.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Col: Summary */}
        <div className="lg:col-span-5">
          <div className="bg-neutral-50 p-8 rounded-xl sticky top-24 border">
            <h3 className="text-xl font-bold mb-6">{t("checkout.inCart")}</h3>
            <div className="space-y-4 mb-8">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex gap-4 max-w-[70%]">
                    <img src={item.image} alt="" className="w-12 h-16 object-cover rounded" />
                    <div>
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-neutral-500">{t("checkout.qty")}: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-medium">{(item.price * item.quantity)} {t("common.currency")}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm border-t pt-4 mb-6">
              <div className="flex justify-between font-bold">
                <span className="text-neutral-600">{t("cart.subtotal")}</span>
                <span>{cartSubtotal()} {t("common.currency")}</span>
              </div>
              {cartSubtotal() > cartTotal() && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>{t("checkout.bundleDiscount")}</span>
                  <span>-{cartSubtotal() - cartTotal()} {t("common.currency")}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600">Shipping</span>
                <span className="font-bold text-indigo-600">
                  {shippingPrice > 0 ? `+${shippingPrice} ${t("common.currency")}` : "Free"}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-xl font-extrabold border-t pt-4 mb-8">
              <span>{t("cart.total")}</span>
              <span>{(cartTotal() + shippingPrice)} {t("common.currency")}</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting || (["InstaPay", "Mobile Wallet", "Bank Transfer"].includes(formData.paymentMethod) && !paymentProof)}
              className="w-full bg-black text-white py-4 rounded-full font-bold flex justify-center items-center hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("checkout.placeOrder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
