"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Tags, X, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Category { _id: string; name: string; parent?: { _id: string } | string | null; }
interface Product {
  _id: string; name: string; slug: string; price: number; priceAfterDiscount?: number | null; stock: number;
  images: string[]; category?: { _id?: string; name: string }; isFeatured: boolean;
}

export default function AdminProductsPage() {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [serialNumber, setSerialNumber] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [variants, setVariants] = useState<any[]>([]);
  const [currentVariantColor, setCurrentVariantColor] = useState("#000000");
  const [sizeInput, setSizeInput] = useState("");
  const [sizeQuantity, setSizeQuantity] = useState("0");
  const [images, setImages] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [priceAfterDiscount, setPriceAfterDiscount] = useState("");
  const [bulkOffers, setBulkOffers] = useState<{quantity: number, price: number}[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/categories"),
    ]);
    const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
    if (pData.products) setProducts(pData.products);
    if (cData.categories) setCategories(cData.categories);
    setLoading(false);
  };

  const addVariant = () => {
    if (!variants.find(v => v.color === currentVariantColor)) {
      setVariants([...variants, { color: currentVariantColor, sizes: [] }]);
    }
  };

  const addSizeToVariant = (color: string) => {
    const s = sizeInput.trim().toUpperCase();
    const q = parseInt(sizeQuantity) || 0;
    if (s) {
      setVariants(prev => prev.map(v => {
        if (v.color === color) {
          const existingSize = v.sizes.find((x: any) => x.size === s);
          if (existingSize) {
            return { ...v, sizes: v.sizes.map((x: any) => x.size === s ? { ...x, quantity: q } : x) };
          }
          return { ...v, sizes: [...v.sizes, { size: s, quantity: q }] };
        }
        return v;
      }));
      setSizeInput("");
      setSizeQuantity("0");
    }
  };

  const removeSizeFromVariant = (color: string, size: string) => {
    setVariants(prev => prev.map(v => {
      if (v.color === color) {
        return { ...v, sizes: v.sizes.filter((s: any) => s.size !== size) };
      }
      return v;
    }));
  };

  const removeVariant = (color: string) => {
    setVariants(prev => prev.filter(v => v.color !== color));
  };

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(""); setStock("0"); setSerialNumber(""); setMainCategoryId(""); setSubCategoryId("");
    setVariants([]); setSizeInput(""); setSizeQuantity("0"); setImages([]); setIsFeatured(false);
    setHasDiscount(false); setPriceAfterDiscount(""); setBulkOffers([]);
    setCurrentVariantColor("#000000"); setError(""); setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const method = editingId ? "PUT" : "POST";
    const finalCategoryId = subCategoryId || mainCategoryId;
    
    // Calculate total stock from variants
    const totalStock = variants.reduce((acc, v) => acc + v.sizes.reduce((sAcc: number, s: any) => sAcc + (parseInt(s.quantity) || 0), 0), 0);
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        description, 
        price, 
        priceAfterDiscount: hasDiscount && priceAfterDiscount ? priceAfterDiscount : null,
        stock: totalStock, 
        category: finalCategoryId, 
        variants, 
        images, 
        isFeatured,
        serialNumber,
        bulkOffers
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); }
    else { resetForm(); setShowForm(false); fetchData(); }
    setSaving(false);
  };

  const openEdit = (product: Product) => {
    setEditingId(product._id);
    setName(product.name);
    setDescription((product as any).description || "");
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setSerialNumber((product as any).serialNumber || "");
    const pCatId = (product as any).category?._id || (product as any).category || "";
    const pCat = categories.find(c => c._id === pCatId);
    if (pCat?.parent) {
      setMainCategoryId(typeof pCat.parent === "string" ? pCat.parent : pCat.parent._id);
      setSubCategoryId(pCat._id);
    } else {
      setMainCategoryId(pCat?._id || "");
      setSubCategoryId("");
    }
    setVariants((product as any).variants || []);
    setImages(product.images || []);
    setIsFeatured(product.isFeatured);
    const discountVal = (product as any).priceAfterDiscount;
    if (discountVal != null && discountVal > 0) {
      setHasDiscount(true);
      setPriceAfterDiscount(discountVal.toString());
    } else {
      setHasDiscount(false);
      setPriceAfterDiscount("");
    }
    setBulkOffers((product as any).bulkOffers || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.sure"))) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.manageProducts")}</h1>
        <button onClick={() => { setShowForm(true); resetForm(); }}
          className="bg-black text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> {t("admin.addProduct")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[95vh] flex flex-col">
            <button onClick={() => setShowForm(false)} className="absolute top-4 z-10 right-4 bg-white/50 backdrop-blur-sm rounded-full p-1 text-neutral-500 hover:text-black hover:bg-neutral-100 transition-all"><X className="w-5 h-5" /></button>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <h2 className="text-xl font-bold mb-6">{editingId ? t("admin.editProduct") : t("admin.addNewProduct")}</h2>
            {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">{t("admin.productName")}</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black" placeholder="DS Classic Tee" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold mb-1">{t("admin.priceUsd")}</label>
                  <input type="number" required min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black" placeholder="100.00" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold mb-1">{t("admin.serialNumber")}</label>
                  <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black" placeholder="SN-XXXX-XXXX" />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <input type="checkbox" id="hasDiscount" checked={hasDiscount} onChange={e => { setHasDiscount(e.target.checked); if (!e.target.checked) setPriceAfterDiscount(""); }} className="w-4 h-4 cursor-pointer accent-green-600" />
                    <label htmlFor="hasDiscount" className="text-sm font-bold cursor-pointer text-green-700">{t("admin.setDiscount") || "Set Discount on this product"}</label>
                  </div>
                  {hasDiscount && (
                    <div className="mt-2">
                      <label className="block text-sm font-semibold mb-1 text-green-700">{t("admin.priceAfterDiscount") || "Price After Discount"} ({t("common.currency")})</label>
                      <input type="number" min="0" step="0.01" value={priceAfterDiscount} onChange={e => setPriceAfterDiscount(e.target.value)}
                        className="w-full sm:w-1/2 border-2 border-green-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 bg-green-50 font-bold text-green-800" placeholder="e.g. 120" />
                      {price && priceAfterDiscount && Number(priceAfterDiscount) < Number(price) && (
                        <p className="text-xs text-green-600 font-bold mt-1">
                          {t("admin.discountPercent") || "Discount"}: {Math.round(((Number(price) - Number(priceAfterDiscount)) / Number(price)) * 100)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold mb-1">{t("admin.categoryStar")}</label>
                  <select required value={mainCategoryId} onChange={e => { setMainCategoryId(e.target.value); setSubCategoryId(""); }}
                    className="w-full border border-neutral-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black">
                    <option value="">{t("admin.selectCategory")}</option>
                    {categories.filter(c => !c.parent).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold mb-1">{t("admin.subCategory") || "Sub Category"}</label>
                  <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)} disabled={!mainCategoryId || categories.filter(c => c.parent && (typeof c.parent === 'string' ? c.parent : c.parent._id) === mainCategoryId).length === 0}
                    className="w-full border border-neutral-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black disabled:opacity-50 disabled:bg-neutral-100">
                    <option value="">{t("admin.selectSubCategory") || "Select Sub Category"}</option>
                    {categories.filter(c => c.parent && (typeof c.parent === 'string' ? c.parent : c.parent._id) === mainCategoryId).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">{t("admin.descriptionStar")}</label>
                  <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black resize-none" placeholder={t("admin.describeProduct")} />
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{t("admin.variantsTitle")}</h3>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={currentVariantColor} onChange={e => setCurrentVariantColor(e.target.value)} className="w-10 h-10 cursor-pointer border-0 p-0" />
                    <button type="button" onClick={addVariant} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-neutral-800 transition-all">{t("admin.addColor")}</button>
                  </div>
                </div>

                <div className="space-y-4">
                  {variants.map((v, vIdx) => (
                    <div key={vIdx} className="border border-neutral-200 rounded-2xl p-6 bg-neutral-50/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ background: v.color }} />
                          <span className="font-bold text-sm uppercase tracking-wider">{v.color}</span>
                        </div>
                        <button type="button" onClick={() => removeVariant(v.color)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <input type="text" placeholder={t("products.selectSize")} value={sizeInput} onChange={e => setSizeInput(e.target.value)}
                          className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
                        <input type="number" placeholder={t("checkout.qty")} value={sizeQuantity} onChange={e => setSizeQuantity(e.target.value)}
                          className="w-20 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
                        <button type="button" onClick={() => addSizeToVariant(v.color)} className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-xs font-bold">{t("admin.addSize")}</button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {v.sizes.map((s: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-2 bg-white border border-neutral-200 pl-3 pr-1 py-1 rounded-xl shadow-sm">
                            <span className="text-xs font-black">{s.size}</span>
                            <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded font-bold text-neutral-500">Qty: {s.quantity}</span>
                            <button type="button" onClick={() => removeSizeFromVariant(v.color, s.size)} className="p-1 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{isRTL ? "عروض حزم الكميات (Bundle Offers)" : "Bundle Offers"}</h3>
                    <p className="text-xs text-neutral-500">{isRTL ? "مثال: 5 قطع بسعر إجمالي 700 بدلاً من 1000" : "e.g. 5 items for a total of 700 instead of 1000"}</p>
                  </div>
                  <button type="button" onClick={() => setBulkOffers([...bulkOffers, { quantity: 2, price: 0 }])} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-bold hover:bg-yellow-200 transition-all">{isRTL ? "إضافة عرض" : "Add Offer"}</button>
                </div>
                <div className="space-y-3">
                  {bulkOffers.map((offer, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-3 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-yellow-800 uppercase mb-1">{isRTL ? "الكمية" : "Quantity"}</label>
                        <input type="number" min="2" value={offer.quantity} onChange={e => {
                          const newOffers = [...bulkOffers];
                          newOffers[oIdx].quantity = parseInt(e.target.value) || 2;
                          setBulkOffers(newOffers);
                        }} className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500 bg-white" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-yellow-800 uppercase mb-1">{isRTL ? "السعر الإجمالي للكمية" : "Total Price for Bundle"}</label>
                        <input type="number" min="0" step="0.01" value={offer.price} onChange={e => {
                          const newOffers = [...bulkOffers];
                          newOffers[oIdx].price = parseFloat(e.target.value) || 0;
                          setBulkOffers(newOffers);
                        }} className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500 bg-white" placeholder={isRTL ? "السعر الإجمالي" : "Total Price"} />
                        {offer.quantity > 0 && price && (
                          <p className="text-[10px] text-yellow-700 mt-1">
                            {isRTL ? "بدلاً من" : "Instead of"}: {offer.quantity * Number(price)} {t("common.currency")}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => setBulkOffers(bulkOffers.filter((_, i) => i !== oIdx))} className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-neutral-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {t("admin.productImages")}
                </label>
                <CldUploadWidget uploadPreset="DSfactor" signatureEndpoint="/api/cloudinary/sign"
                  onSuccess={(result: any) => {
                    if (result.info?.secure_url) { setImages(prev => [...prev, result.info.secure_url]); }
                  }}
                  options={{ multiple: true, maxFiles: 5, resourceType: "image", clientAllowedFormats: ["webp", "png", "jpg", "jpeg"] }}>
                  {({ open }) => (
                    <button type="button" onClick={() => open()}
                      className="w-full border-2 border-dashed border-neutral-300 rounded-2xl py-8 flex flex-col items-center justify-center hover:border-black hover:bg-neutral-50 transition-all group">
                      <div className="bg-neutral-100 p-3 rounded-full group-hover:bg-black group-hover:text-white transition-colors mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-sm">{t("admin.clickUpload")}</span>
                      <span className="text-xs text-neutral-500 mt-1">{t("admin.imageFormats")}</span>
                    </button>
                  )}
                </CldUploadWidget>
                {images.length > 0 && (
                  <div className="flex gap-3 mt-4 flex-wrap">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 shadow-sm group">
                        <img src={img} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="featured" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                <label htmlFor="featured" className="text-sm font-semibold cursor-pointer">{t("admin.featuredProduct")}</label>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors flex justify-center items-center">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? t("admin.updateProduct") : t("admin.createProduct"))}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" /></div>
        ) : products.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50">
              <tr className="border-b text-neutral-500">
                <th className="p-4 font-medium">{t("admin.productTh")}</th>
                <th className="p-4 font-medium">{t("admin.categoryTh")}</th>
                <th className="p-4 font-medium">{t("admin.price")}</th>
                <th className="p-4 font-medium">{t("admin.stockTh")}</th>
                <th className="p-4 font-medium text-right">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b last:border-0 hover:bg-neutral-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-200 rounded-lg overflow-hidden shrink-0">
                        {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <div className="flex items-center gap-2">
                          {product.isFeatured && <span className="text-[10px] text-yellow-600 font-medium">⭐ {t("admin.featuredBadge")}</span>}
                          {(product as any).serialNumber && <span className="text-[10px] text-neutral-400 font-mono italic">SN: {(product as any).serialNumber}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-neutral-600">{product.category?.name || "—"}</td>
                  <td className="p-4 font-semibold">
                    {product.priceAfterDiscount != null && product.priceAfterDiscount > 0 && product.priceAfterDiscount < product.price ? (
                      <div className="flex flex-col">
                        <span className="line-through text-neutral-400 text-xs">{product.price.toFixed(2)} {t("common.currency")}</span>
                        <span className="text-green-600 font-black">{product.priceAfterDiscount.toFixed(2)} {t("common.currency")}</span>
                      </div>
                    ) : (
                      <span>{product.price.toFixed(2)} {t("common.currency")}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded-full text-[10px] w-fit font-bold uppercase ${product.stock > 0 ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                        {product.stock > 0 ? `${product.stock} ${t("admin.inStock")}` : t("admin.outOfStock")}
                      </span>
                      {/* Variant Breakdown */}
                      {(product as any).variants?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(product as any).variants.map((v: any, i: number) => (
                            <div key={i} className="flex items-center gap-1 bg-white border border-neutral-100 px-1.5 py-0.5 rounded text-[9px] font-medium text-neutral-500 shadow-sm" title={v.color}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />
                              {v.sizes.map((s: any) => `${s.size}:${s.quantity}`).join(", ")}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(product)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                        {t("admin.editBtn")}
                      </button>
                      <button onClick={() => handleDelete(product._id)} className="text-red-500 hover:text-red-700 font-medium text-xs flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> {t("admin.deleteBtn")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-neutral-500">
            <Tags className="w-12 h-12 mb-3 opacity-20 mx-auto" />
            <p>{t("admin.noProductsYet")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
