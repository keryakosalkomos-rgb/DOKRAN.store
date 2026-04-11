"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Governorate {
  id: string;
  name: string;
  nameAr: string;
  price: number;
}

export default function AdminShippingPage() {
  const { t, lang } = useLanguage();
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isRTL = lang === "ar";

  useEffect(() => {
    fetchShippingSettings();
  }, []);

  const fetchShippingSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings/shipping");
      const data = await res.json();
      if (data.governorates) {
        setGovernorates(data.governorates);
      }
    } catch (error) {
      console.error("Failed to fetch shipping settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (id: string, price: string) => {
    setGovernorates(prev => 
      prev.map(gov => gov.id === id ? { ...gov, price: Number(price) || 0 } : gov)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorates }),
      });
      if (res.ok) {
        setMessage(lang === "ar" ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!");
      }
    } catch (error) {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">{t("admin.shipping")}</h1>
          <p className="text-neutral-500 font-medium text-sm mt-1">{t("admin.shippingDesc")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {t("admin.saveSettings") || "Save Settings"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className={`p-4 font-bold text-neutral-500 ${isRTL ? "text-right" : "text-left"}`}>{t("custom.city")}</th>
              <th className={`p-4 font-bold text-neutral-500 w-48 ${isRTL ? "text-right" : "text-left"}`}>{t("admin.shippingFee")}</th>
            </tr>
          </thead>
          <tbody>
            {governorates.map((gov) => (
              <tr key={gov.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-neutral-100 p-2 rounded-lg">
                      <MapPin className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">{isRTL ? gov.nameAr : gov.name}</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{gov.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={gov.price}
                      onChange={(e) => handlePriceChange(gov.id, e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
        <div className="bg-amber-100 p-2 h-fit rounded-lg">
          <MapPin className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-amber-900 mb-1">{t("admin.importantNote")}</h3>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            These prices will be automatically applied to standard orders during checkout based on the governorate selected by the customer. Make sure to update these prices if your shipping carrier rates change.
          </p>
        </div>
      </div>
    </div>
  );
}
