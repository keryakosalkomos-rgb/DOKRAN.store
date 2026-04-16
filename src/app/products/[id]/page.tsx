"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Ruler } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import SizeGuideModal from "@/components/products/SizeGuideModal";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  // Stock calculation moved to top level to avoid hook ordering errors
  const currentVariant = product?.variants?.find((v: any) => v.color === selectedColor);
  const sizeObj = currentVariant?.sizes.find((s: any) => s.size === selectedSize);
  const maxAvailableStock = sizeObj ? sizeObj.quantity : (product?.variants && product?.variants.length > 0 ? 0 : (product?.stock || 0));

  useEffect(() => {
    if (product && quantity > maxAvailableStock) {
      setQuantity(Math.max(1, maxAvailableStock));
    }
  }, [selectedSize, selectedColor, maxAvailableStock, product, quantity]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
          // NEW: Auto-select if only one variant/color exists
          if (data.variants && data.variants.length === 1) {
            setSelectedColor(data.variants[0].color);
            if (data.variants[0].sizes.length === 1) {
              setSelectedSize(data.variants[0].sizes[0].size);
            }
          } else if (data.variants && data.variants.length > 0) {
            // No auto-select for color if multiple exist
          } else {
            // Legacy auto-select
            if (data.sizes?.length === 1) setSelectedSize(typeof data.sizes[0] === 'string' ? data.sizes[0] : data.sizes[0].size);
            if (data.colors?.length === 1) setSelectedColor(data.colors[0]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch product", e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    /* Removed mandatory login for adding to cart */
    // if (status === "unauthenticated") { ... }
    
    // Check required variants (NEW variants system)
    if (product.variants && product.variants.length > 0) {
      if (!selectedColor) {
        setError(t("products.selectColor") || "Please select a color first");
        setTimeout(() => setError(null), 3000);
        return;
      }
      const variant = product.variants.find((v: any) => v.color === selectedColor);
      if (variant?.sizes?.length > 0 && !selectedSize) {
        setError(t("products.selectSize") || "Please select a size first");
        setTimeout(() => setError(null), 3000);
        return;
      }
    } else {
      // Legacy variants check
      if (product.sizes?.length > 0 && !selectedSize) {
        setError(t("products.selectSize") || "Please select a size first");
        setTimeout(() => setError(null), 3000);
        return;
      }
      if (product.colors?.length > 0 && !selectedColor) {
        setError(t("products.selectColor") || "Please select a color first");
        setTimeout(() => setError(null), 3000);
        return;
      }
    }
    setError(null);

    const currentVariant = product.variants?.find((v: any) => v.color === selectedColor);
    const sizeObj = currentVariant?.sizes.find((s: any) => s.size === selectedSize);
    const maxAvailableStock = sizeObj ? sizeObj.quantity : (product.variants && product.variants.length > 0 ? 0 : product.stock);

    setIsAdding(true);
    addItem({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: Math.min(quantity, maxAvailableStock),
      image: product.images?.[0],
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      maxStock: maxAvailableStock,
    }, maxAvailableStock);

    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">{t("products.empty")}</h1>
        <button onClick={() => router.back()} className="text-neutral-500 hover:text-black">
          &larr; Go Back
        </button>
      </div>
    );
  }

  const isOutOfStock = product?.stock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 md:py-12">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm font-bold text-neutral-500 hover:text-black mb-8 transition-colors"
      >
        <ArrowLeft className={`w-4 h-4 ${isRTL ? "ml-2 rotate-180" : "mr-2"}`} />
        {isRTL ? "عودة للتشكيلة" : "Back to Collection"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images Section */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[3/4] md:aspect-[4/5] bg-neutral-100 rounded-3xl overflow-hidden relative">
            <img 
              src={product.images?.[activeImage] || "https://via.placeholder.com/600"} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isFeatured && (
              <span className="absolute top-4 left-4 bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                HOT
              </span>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                <span className="bg-black text-white text-sm font-black uppercase tracking-widest px-6 py-3 rounded-full shadow-2xl">
                  {t("products.outOfStock") || "Out of Stock"}
                </span>
              </div>
            )}
          </div>
          
          {/* Thumbnails */}
          {product.images?.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {product.images.map((img: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                    activeImage === idx ? "border-black" : "border-transparent hover:border-neutral-200"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div className="flex flex-col py-2 md:py-6">
          <div className="mb-2 text-xs font-black tracking-widest uppercase text-neutral-400">
            {product.category?.name || "Premium Collection"}
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{product.name}</h1>
          <div className="flex items-center gap-4 mb-8">
            <p className="text-2xl font-bold text-neutral-800 decoration-indigo-500/30 underline underline-offset-8">
              {product.price} {t("common.currency")}
            </p>
            {product.stock > 0 && product.stock < 10 && (
              <span className="bg-neutral-100 text-neutral-600 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {product.stock} {t("products.itemsLeft") || "items left in stock"}
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {t("products.outOfStock") || "Out of stock"}
              </span>
            )}
          </div>

          <p className="text-neutral-600 mb-10 leading-relaxed font-medium">
            {product.description}
          </p>

          <div className="w-full h-px bg-neutral-100 mb-8"></div>

          {/* Color Selection (Variants System) */}
          {product.variants && product.variants.length > 0 ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold uppercase tracking-widest">{t("products.selectColor")}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v: any) => (
                  <button
                    key={v.color}
                    onClick={() => {
                      setSelectedColor(v.color);
                      setSelectedSize(null); // Reset size when color changes
                    }}
                    className={`h-12 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center ${
                      v.color.startsWith("#") ? "w-12 px-0 py-0" : "px-6 gap-2"
                    } ${
                      selectedColor === v.color 
                        ? "border-black bg-black text-white" 
                        : "border-neutral-200 bg-white text-neutral-800 hover:border-black"
                    }`}
                    title={v.color}
                  >
                    <span 
                      className={`rounded-full border border-neutral-300 shadow-inner ${v.color.startsWith("#") ? "w-6 h-6" : "w-4 h-4"}`} 
                      style={{ backgroundColor: v.color.startsWith("#") ? v.color : v.color.toLowerCase() }}
                    ></span>
                    {!v.color.startsWith("#") && <span>{v.color}</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Legacy Color Selection */
            product.colors && product.colors.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold uppercase tracking-widest">{t("products.selectColor")}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color: string) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`h-12 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center ${
                        color.startsWith("#") ? "w-12 px-0 py-0" : "px-6 gap-2"
                      } ${
                        selectedColor === color 
                          ? "border-black bg-black text-white" 
                          : "border-neutral-200 bg-white text-neutral-800 hover:border-black"
                      }`}
                      title={color}
                    >
                      <span 
                        className={`rounded-full border border-neutral-300 shadow-inner ${color.startsWith("#") ? "w-6 h-6" : "w-4 h-4"}`} 
                        style={{ backgroundColor: color.startsWith("#") ? color : color.toLowerCase() }}
                      ></span>
                      {!color.startsWith("#") && <span>{color}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Size Selection */}
          {product.variants && product.variants.length > 0 ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold uppercase tracking-widest">{t("products.selectSize")}</span>
                <div className="flex items-center gap-4">
                  {!selectedColor && <span className="text-[10px] text-red-500 font-bold uppercase">Select color first</span>}
                  <button 
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <Ruler className="w-3 h-3" />
                    {t("products.sizeGuide") || "Size Guide"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedColor ? (
                  product.variants.find((v: any) => v.color === selectedColor)?.sizes.map((sObj: any) => {
                    const isSizeOutOfStock = sObj.quantity <= 0;
                    return (
                      <button
                        key={sObj.size}
                        onClick={() => setSelectedSize(sObj.size)}
                        disabled={isSizeOutOfStock}
                        className={`h-auto min-h-[3rem] py-2 px-4 rounded-xl border-2 uppercase text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                          isSizeOutOfStock ? "opacity-70 cursor-not-allowed border-neutral-200 bg-neutral-50" :
                          selectedSize === sObj.size 
                            ? "border-black bg-black text-white" 
                            : "border-neutral-200 bg-white text-neutral-800 hover:border-black"
                        }`}
                      >
                        <span className={`font-black ${isSizeOutOfStock ? "line-through text-neutral-400" : ""}`}>{sObj.size}</span>
                        {!isSizeOutOfStock && sObj.quantity > 0 && sObj.quantity < 6 && (
                          <span className={`text-[10px] font-bold lowercase tracking-wide ${selectedSize === sObj.size ? "text-white/80" : "text-emerald-600"}`}>
                            {sObj.quantity} {t("products.left") || "left"}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-sm text-neutral-400 font-medium italic">Please select a color to see available sizes.</div>
                )}
              </div>
            </div>
          ) : (
            /* Legacy Size Selection */
            product.sizes && product.sizes.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold uppercase tracking-widest">{t("products.selectSize")}</span>
                  <button 
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <Ruler className="w-3 h-3" />
                    {t("products.sizeGuide") || "Size Guide"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((sObj: any) => {
                    const size = typeof sObj === 'string' ? sObj : sObj.size;
                    const qty = typeof sObj === 'object' ? sObj.quantity : null;
                    const isSizeOutOfStock = qty !== null && qty <= 0;
                    return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={isSizeOutOfStock}
                      className={`h-auto min-h-[3rem] py-2 px-4 rounded-xl border-2 uppercase text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                        isSizeOutOfStock ? "opacity-70 cursor-not-allowed border-neutral-200 bg-neutral-50" :
                        selectedSize === size 
                          ? "border-black bg-black text-white" 
                          : "border-neutral-200 bg-white text-neutral-800 hover:border-black"
                      }`}
                    >
                      <span className={`font-black ${isSizeOutOfStock ? "line-through text-neutral-400" : ""}`}>{size}</span>
                      {isSizeOutOfStock ? (
                        <span className="text-[10px] font-bold text-red-500 lowercase tracking-wide">out of stock</span>
                      ) : qty !== null && qty > 0 ? (
                        <span className={`text-[10px] font-bold lowercase tracking-wide ${selectedSize === size ? "text-white/80" : "text-emerald-600"}`}>
                          {qty} {t("products.left") || "left"}
                        </span>
                      ) : null}
                    </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Quantity & Add to Cart */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-xl mt-auto border border-red-100 flex items-center gap-2 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {error}
            </div>
          )}
          <div className={`flex flex-col sm:flex-row gap-4 pt-8 ${!error ? 'mt-auto' : ''}`}>
            <div className="flex items-center justify-between border-2 border-neutral-200 rounded-full h-14 min-h-[56px] shrink-0 px-6 sm:w-1/3">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="text-neutral-400 hover:text-black transition-colors"
                disabled={isOutOfStock}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-lg w-8 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(maxAvailableStock, quantity + 1))}
                className={`transition-colors ${quantity >= maxAvailableStock ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-black"}`}
                disabled={isOutOfStock || quantity >= maxAvailableStock}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              className={`w-full sm:flex-1 h-14 min-h-[56px] shrink-0 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center transition-all ${
                isOutOfStock
                  ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-neutral-800 active:scale-[0.98] shadow-2xl shadow-black/20"
              }`}
            >
              {isAdding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : showSuccess ? (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center">
                  <Check className="w-5 h-5 mr-2" /> {t("products.addSuccess")}
                </motion.div>
              ) : (
                <div className="flex items-center">
                  <ShoppingBag className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />
                  {isOutOfStock ? t("products.outOfStock") : t("products.addToCart")}
                </div>
              )}
            </button>
          </div>

        </div>
      </div>

      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </div>
  );
}
