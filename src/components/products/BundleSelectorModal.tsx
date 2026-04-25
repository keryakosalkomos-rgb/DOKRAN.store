"use client";

import { useState, useEffect } from "react";
import { X, Check, ArrowRight, Package } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/useCartStore";

interface BundleOffer {
  quantity: number;
  price: number;
}

interface BundleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  offer: BundleOffer;
  onSuccess: () => void;
}

export default function BundleSelectorModal({ isOpen, onClose, product, offer, onSuccess }: BundleSelectorModalProps) {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const addItem = useCartStore((state) => state.addItem);

  // Array of selections. Each is { color: string | null, size: string | null }
  const [selections, setSelections] = useState<{ color: string | null; size: string | null }[]>([]);

  useEffect(() => {
    if (isOpen && offer) {
      // Initialize empty selections based on offer quantity
      setSelections(Array.from({ length: offer.quantity }).map(() => ({ color: null, size: null })));
    }
  }, [isOpen, offer]);

  if (!isOpen || !product || !offer) return null;

  const handleUpdateSelection = (index: number, key: 'color' | 'size', value: string) => {
    const newSelections = [...selections];
    newSelections[index] = { ...newSelections[index], [key]: value };
    // Auto-reset size if color changes
    if (key === 'color') {
      newSelections[index].size = null;
    }
    setSelections(newSelections);
  };

  const isFullySelected = selections.every(s => {
    const hasVariants = product.variants && product.variants.length > 0;
    if (hasVariants) {
      return s.color && s.size;
    }
    // Legacy fallback
    const needsColor = product.colors && product.colors.length > 0;
    const needsSize = product.sizes && product.sizes.length > 0;
    return (!needsColor || s.color) && (!needsSize || s.size);
  });

  const handleAddBundleToCart = () => {
    if (!isFullySelected) return;

    // Add each selected item to the cart
    selections.forEach(sel => {
      const effectivePrice = (product.priceAfterDiscount != null && product.priceAfterDiscount > 0 && product.priceAfterDiscount < product.price) ? product.priceAfterDiscount : product.price;
      
      let maxStock = product.stock;
      if (product.variants && product.variants.length > 0) {
        const currentVariant = product.variants.find((v: any) => v.color === sel.color);
        const sizeObj = currentVariant?.sizes.find((s: any) => s.size === sel.size);
        if (sizeObj) maxStock = sizeObj.quantity;
      }

      addItem({
        product: product._id,
        name: product.name,
        price: effectivePrice,
        quantity: 1, // Adding them one by one allows cart group logic to apply
        image: product.images?.[0],
        size: sel.size || undefined,
        color: sel.color || undefined,
        maxStock: maxStock,
        bulkOffers: product.bulkOffers,
      });
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white rounded-t-3xl sm:rounded-3xl sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-black">{t("products.chooseOfferDetails")}</h2>
            <p className="text-sm text-neutral-500 mt-1 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" />
                {t("products.offerItemsPrice")?.replace("{{qty}}", offer.quantity.toString()).replace("{{price}}", offer.price.toString()).replace("{{currency}}", t("common.currency") || "")}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-black"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {selections.map((sel, idx) => (
            <div key={idx} className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <h3 className="font-bold">{t("products.itemNum")?.replace("{{num}}", (idx + 1).toString())}</h3>
              </div>

              {/* Color Selection */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500">{t("products.selectColor")}</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v: any) => (
                      <button
                        key={v.color}
                        onClick={() => handleUpdateSelection(idx, 'color', v.color)}
                        className={`h-10 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center ${
                          v.color.startsWith("#") ? "w-10 px-0 py-0" : "px-4 gap-2"
                        } ${
                          sel.color === v.color 
                            ? "border-black bg-black text-white" 
                            : "border-neutral-200 bg-white text-neutral-800 hover:border-black"
                        }`}
                        title={v.color}
                      >
                        <span 
                          className={`rounded-full border border-neutral-300 shadow-inner ${v.color.startsWith("#") ? "w-5 h-5" : "w-3 h-3"}`} 
                          style={{ backgroundColor: v.color.startsWith("#") ? v.color : v.color.toLowerCase() }}
                        ></span>
                        {!v.color.startsWith("#") && <span>{v.color}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {product.variants && product.variants.length > 0 && sel.color && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500">{t("products.selectSize")}</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.find((v: any) => v.color === sel.color)?.sizes.map((sObj: any) => {
                      // Check if already selected max available stock across all selections
                      const alreadySelectedCount = selections.filter(s => s.color === sel.color && s.size === sObj.size).length;
                      const isOutOfStock = sObj.quantity <= alreadySelectedCount && sel.size !== sObj.size; // Disable if out of stock, unless it's currently selected

                      return (
                        <button
                          key={sObj.size}
                          onClick={() => handleUpdateSelection(idx, 'size', sObj.size)}
                          disabled={isOutOfStock}
                          className={`py-2 px-4 rounded-xl border-2 uppercase text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            isOutOfStock ? "opacity-50 cursor-not-allowed border-neutral-200 bg-neutral-100" :
                            sel.size === sObj.size 
                              ? "border-black bg-black text-white" 
                              : "border-neutral-200 bg-white text-neutral-800 hover:border-black"
                          }`}
                        >
                          {sObj.size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Legacy Fallbacks if variants don't exist */}
              {(!product.variants || product.variants.length === 0) && (
                <div className="text-sm text-neutral-500 italic">
                  Legacy variant selector is unsupported in this modal.
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 border-t bg-white sticky bottom-0 z-20 rounded-b-3xl">
          <button
            onClick={handleAddBundleToCart}
            disabled={!isFullySelected}
            className={`w-full h-14 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center transition-all ${
              isFullySelected 
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-[0.98]" 
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {isFullySelected ? (
              <span className="flex items-center">
                {t("products.addBundleAndCheckout")} 
                <ArrowRight className={`w-5 h-5 ${isRTL ? "mr-2 rotate-180" : "ml-2"}`} />
              </span>
            ) : (
              <span>{t("products.pleaseSelectAllItems")}</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
