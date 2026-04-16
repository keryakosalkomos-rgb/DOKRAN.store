"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, GripVertical, Package } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function AdminSizeGuidesPage() {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";

  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/size-guides?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGuides(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/size-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guides),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert(isRTL ? "تم الحفظ بنجاح!" : "Saved successfully!");
    } catch (e) {
      alert(isRTL ? "حدث خطأ أثناء الحفظ. جرب تحديث الصفحة أو تسجيل الدخول." : "Error saving. Try refreshing or logging in again.");
    } finally {
      setSaving(false);
    }
  };

  const addGuide = () => {
    setGuides([...guides, { 
      id: Date.now().toString(), 
      name: isRTL ? "دليل مقاسات جديد" : "New Size Guide",
      columns: ["Size", "Weight (kg)"],
      rows: [["M", "50-65"]]
    }]);
  };

  const deleteGuide = (guideId: string) => {
    if (confirm(isRTL ? "هل أنت متأكد من حذف هذا الدليل؟" : "Are you sure you want to delete this guide?")) {
      setGuides(guides.filter(g => g.id !== guideId));
    }
  };

  const updateGuideName = (guideId: string, name: string) => {
    setGuides(guides.map(g => g.id === guideId ? { ...g, name } : g));
  };

  const addColumn = (guideId: string) => {
    setGuides(guides.map(g => {
      if (g.id === guideId) {
        return {
          ...g,
          columns: [...g.columns, "New Column"],
          rows: g.rows.map((row: string[]) => [...row, ""])
        };
      }
      return g;
    }));
  };

  const updateColumnName = (guideId: string, colIndex: number, newName: string) => {
    setGuides(guides.map(g => {
      if (g.id === guideId) {
        const newCols = [...g.columns];
        newCols[colIndex] = newName;
        return { ...g, columns: newCols };
      }
      return g;
    }));
  };

  const deleteColumn = (guideId: string, colIndex: number) => {
    setGuides(guides.map(g => {
      if (g.id === guideId) {
        const newCols = g.columns.filter((_: any, idx: number) => idx !== colIndex);
        const newRows = g.rows.map((row: string[]) => row.filter((_: any, idx: number) => idx !== colIndex));
        return { ...g, columns: newCols, rows: newRows };
      }
      return g;
    }));
  };

  const addRow = (guideId: string) => {
    setGuides(guides.map(g => {
      if (g.id === guideId) {
        return {
          ...g,
          rows: [...g.rows, Array(g.columns.length).fill("")]
        };
      }
      return g;
    }));
  };

  const updateCell = (guideId: string, rowIndex: number, colIndex: number, value: string) => {
    setGuides(guides.map(g => {
      if (g.id === guideId) {
        const newRows = [...g.rows];
        newRows[rowIndex] = [...newRows[rowIndex]];
        newRows[rowIndex][colIndex] = value;
        return { ...g, rows: newRows };
      }
      return g;
    }));
  };

  const deleteRow = (guideId: string, rowIndex: number) => {
    setGuides(guides.map(g => {
      if (g.id === guideId) {
        const newRows = g.rows.filter((_: any, idx: number) => idx !== rowIndex);
        return { ...g, rows: newRows };
      }
      return g;
    }));
  };

  if (loading) {
    return <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.sizeGuides")}</h1>
        <div className="flex gap-4">
          <button 
            onClick={addGuide}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {isRTL ? "إضافة دليل" : "Add Guide"}
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isRTL ? "حفظ التغييرات" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {guides.map((guide) => (
          <div key={guide.id} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-neutral-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b">
              <input 
                type="text"
                value={guide.name}
                onChange={(e) => updateGuideName(guide.id, e.target.value)}
                className="text-2xl font-black bg-transparent border-b-2 border-transparent hover:border-neutral-200 focus:border-black outline-none px-2 py-1 w-full max-w-sm"
                placeholder={isRTL ? "اسم الدليل (مثال: دليل الرجالي)" : "Guide Name"}
              />
              <button 
                onClick={() => deleteGuide(guide.id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors flex shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="w-10"></th>
                    {guide.columns.map((col: string, colIdx: number) => (
                      <th key={colIdx} className="p-2 border-b border-r bg-neutral-50 rounded-t-lg relative group">
                        <input 
                          type="text"
                          value={col}
                          onChange={(e) => updateColumnName(guide.id, colIdx, e.target.value)}
                          className="w-full bg-transparent text-center font-bold text-sm outline-none px-2 py-1"
                        />
                        {guide.columns.length > 1 && (
                          <button 
                            onClick={() => deleteColumn(guide.id, colIdx)}
                            className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </th>
                    ))}
                    <th className="w-16 p-2 text-center align-middle">
                      <button 
                        onClick={() => addColumn(guide.id)}
                        className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition-colors mx-auto flex"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((row: string[], rowIdx: number) => (
                    <tr key={rowIdx}>
                      <td className="text-center p-2 text-neutral-400">
                        <GripVertical className="w-4 h-4 mx-auto opacity-50 cursor-move" />
                      </td>
                      {row.map((cell: string, colIdx: number) => (
                        <td key={colIdx} className="p-0 border-b border-r">
                          <input 
                            type="text"
                            value={cell}
                            onChange={(e) => updateCell(guide.id, rowIdx, colIdx, e.target.value)}
                            className="w-full text-center px-4 py-3 outline-none hover:bg-neutral-50 focus:bg-neutral-50 transition-colors"
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="p-2 text-center align-middle border-b">
                        <button 
                          onClick={() => deleteRow(guide.id, rowIdx)}
                          className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0 mx-auto flex"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td colSpan={guide.columns.length} className="pt-4">
                      <button 
                        onClick={() => addRow(guide.id)}
                        className="w-full py-3 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-500 font-bold hover:border-black hover:text-black transition-colors"
                      >
                        <Plus className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {guides.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-neutral-100 shadow-sm">
            <Package className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
            <p className="text-xl font-medium text-neutral-600 mb-6">
              {isRTL ? "لم تقم بإنشاء أي أدلة مقاسات بعد." : "No size guides created yet."}
            </p>
            <button 
              onClick={addGuide}
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-neutral-800 transition-colors"
            >
              <Plus className="w-6 h-6" />
              {isRTL ? "إنشاء دليل مقاسات" : "Create Size Guide"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
