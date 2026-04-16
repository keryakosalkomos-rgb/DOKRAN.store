"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ruler } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SizeGuideModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";

  const [guides, setGuides] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/admin/size-guides?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setGuides(data);
            setActiveTab(data[0].id);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b relative z-10 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black">{t("products.sizeGuide") || "Size Guide"}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="p-20 flex justify-center items-center">
                  <div className="w-8 h-8 border-4 border-neutral-200 border-t-black rounded-full animate-spin"></div>
                </div>
              ) : guides.length === 0 ? (
                <div className="p-20 text-center text-neutral-500 font-medium">
                  {isRTL ? "لا توجد أدلة مقاسات متاحة حالياً." : "No size guides available currently."}
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b overflow-x-auto hide-scrollbar bg-neutral-50 px-6 pt-2">
                    {guides.map(guide => (
                      <button
                        key={guide.id}
                        onClick={() => setActiveTab(guide.id)}
                        className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-4 transition-all ${
                          activeTab === guide.id 
                            ? "border-black text-black bg-white rounded-t-xl" 
                            : "border-transparent text-neutral-500 hover:text-black hover:bg-neutral-100/50"
                        }`}
                      >
                        {guide.name}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content (Table) */}
                  <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
                    {guides.map(guide => {
                      if (guide.id !== activeTab) return null;
                      return (
                        <div key={guide.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                          <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                  {guide.columns.map((col: string, idx: number) => (
                                    <th 
                                      key={idx} 
                                      className={`p-4 font-bold text-sm text-neutral-800 ${isRTL ? "text-right" : "text-left"} border-x border-neutral-200 last:border-r-0`}
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-200">
                                {guide.rows.map((row: string[], rowIdx: number) => (
                                  <tr key={rowIdx} className="hover:bg-neutral-50 transition-colors">
                                    {row.map((cell: string, cellIdx: number) => (
                                      <td 
                                        key={cellIdx} 
                                        className={`p-4 text-sm font-medium border-x border-neutral-100 last:border-r-0 ${
                                          cellIdx === 0 ? "font-black text-black" : "text-neutral-600"
                                        }`}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="mt-6 text-sm text-neutral-400 text-center italic">
                            {isRTL 
                              ? "قد تختلف المقاسات بشكل طفيف من منتج لآخر. يرجى مراجعة تفاصيل المنتج للمزيد من الدقة."
                              : "Sizes may vary slightly depending on the style. Please check product details for more accuracy."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
