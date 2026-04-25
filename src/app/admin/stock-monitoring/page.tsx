"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Loader2, ArrowUpDown, Eye, ShoppingCart, AlertCircle, TrendingUp } from "lucide-react";
import Link from "next/link";

interface ProductStat {
  _id: string;
  name: string;
  stock: number;
  visits: number;
  salesCount: number;
  outOfStockAttempts: number;
  image?: string;
}

export default function StockMonitoringPage() {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const [products, setProducts] = useState<ProductStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProductStat; direction: "asc" | "desc" }>({
    key: "visits",
    direction: "desc",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.products) {
        setProducts(data.products.map((p: any) => ({
          _id: p._id,
          name: p.name,
          stock: p.stock || 0,
          visits: p.visits || 0,
          salesCount: p.salesCount || 0,
          outOfStockAttempts: p.outOfStockAttempts || 0,
          image: p.images?.[0],
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof ProductStat) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aVal = a[sortConfig.key] || 0;
    const bVal = b[sortConfig.key] || 0;
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === "asc" ? <ArrowUpDown className="w-3 h-3 text-black" /> : <ArrowUpDown className="w-3 h-3 text-black rotate-180" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{isRTL ? "مراقبة المخزون والزيارات" : "Stock & Visits Monitoring"}</h1>
          <p className="text-neutral-500 mt-2 text-sm">{isRTL ? "تتبع زيارات المنتجات والمحاولات الشرائية للمنتجات المنتهية" : "Track product visits and out-of-stock purchase attempts"}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-neutral-50/50 text-xs uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-100">
                  <th className={`py-5 px-6 ${isRTL ? "text-right" : "text-left"}`}>
                    {isRTL ? "المنتج" : "Product"}
                  </th>
                  <th 
                    className="py-5 px-6 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("stock")}
                  >
                    <div className={`flex items-center gap-2 ${isRTL ? "justify-end" : ""}`}>
                      {isRTL ? "المخزون" : "Stock"} {getSortIcon("stock")}
                    </div>
                  </th>
                  <th 
                    className="py-5 px-6 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("visits")}
                  >
                    <div className={`flex items-center gap-2 ${isRTL ? "justify-end" : ""}`}>
                      <Eye className="w-4 h-4 text-blue-500" />
                      {isRTL ? "الزيارات" : "Visits"} {getSortIcon("visits")}
                    </div>
                  </th>
                  <th 
                    className="py-5 px-6 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("salesCount")}
                  >
                    <div className={`flex items-center gap-2 ${isRTL ? "justify-end" : ""}`}>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {isRTL ? "المبيعات" : "Sales"} {getSortIcon("salesCount")}
                    </div>
                  </th>
                  <th 
                    className="py-5 px-6 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("outOfStockAttempts")}
                  >
                    <div className={`flex items-center gap-2 ${isRTL ? "justify-end" : ""}`}>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {isRTL ? "محاولات الشراء (نفذت الكمية)" : "OOS Attempts"} {getSortIcon("outOfStockAttempts")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sortedProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-neutral-50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                          <img src={product.image || "https://via.placeholder.com/40"} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <Link href={`/products/${product._id}`} target="_blank" className="font-bold text-sm hover:underline">
                          {product.name}
                        </Link>
                      </div>
                    </td>
                    <td className={`py-4 px-6 font-medium ${isRTL ? "text-right" : ""}`}>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock <= 0 ? "bg-red-100 text-red-700" : product.stock < 10 ? "bg-orange-100 text-orange-700" : "bg-neutral-100 text-neutral-700"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className={`py-4 px-6 font-black text-blue-600 ${isRTL ? "text-right" : ""}`}>
                      {product.visits}
                    </td>
                    <td className={`py-4 px-6 font-black text-green-600 ${isRTL ? "text-right" : ""}`}>
                      {product.salesCount}
                    </td>
                    <td className={`py-4 px-6 ${isRTL ? "text-right" : ""}`}>
                      <span className={`font-black ${product.outOfStockAttempts > 0 ? "text-red-600" : "text-neutral-400"}`}>
                        {product.outOfStockAttempts}
                      </span>
                    </td>
                  </tr>
                ))}
                {sortedProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400 font-medium">
                      {isRTL ? "لا توجد منتجات" : "No products found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
