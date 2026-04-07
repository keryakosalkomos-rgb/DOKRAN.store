"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2, Globe, CheckCircle, UploadCloud } from "lucide-react";

interface HomeCollection {
  id: string;
  title: string;
  image: string;
  link: string;
}

export default function AdminHomepagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [heroImage, setHeroImage] = useState("");
  const [homeCollections, setHomeCollections] = useState<HomeCollection[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCollectionId, setUploadingCollectionId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then(res => res.json()),
      fetch("/api/admin/categories").then(res => res.json())
    ])
      .then(([settingsData, categoriesData]) => {
        if (!settingsData.error) {
          setHeroImage(settingsData.heroImage || "");
          if (Array.isArray(settingsData.homeCollections)) {
            setHomeCollections(settingsData.homeCollections);
          }
        }
        if (categoriesData.categories) {
          setCategories(categoriesData.categories);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleImageUpload = async (file: File, type: 'hero' | 'collection', collectionId?: string) => {
    if (!file) return;

    if (type === 'hero') setUploadingHero(true);
    else if (collectionId) setUploadingCollectionId(collectionId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.secure_url) {
        if (type === 'hero') {
          setHeroImage(data.secure_url);
        } else if (collectionId) {
          updateCollection(collectionId, 'image', data.secure_url);
        }
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image");
    } finally {
      if (type === 'hero') setUploadingHero(false);
      else if (collectionId) setUploadingCollectionId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImage, homeCollections }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addCollection = () => {
    setHomeCollections([
      ...homeCollections,
      { id: Date.now().toString(), title: "New Collection", image: "", link: "" }
    ]);
  };

  const updateCollection = (id: string, field: keyof HomeCollection, value: string) => {
    setHomeCollections(homeCollections.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCollection = (id: string) => {
    setHomeCollections(homeCollections.filter(c => c.id !== id));
  };

  if (loading) {
    return <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Homepage Layout</h1>
      
      <form onSubmit={handleSave}>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center border-b pb-4">
            <Globe className="w-5 h-5 mr-3 text-neutral-500" />
            Hero Section
          </h2>
          <div>
            <label className="block text-sm font-medium mb-2">Main Background Image</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={heroImage} 
                onChange={(e) => setHeroImage(e.target.value)} 
                className="flex-1 border rounded-lg px-4 py-2 bg-neutral-50 focus:ring-2 focus:ring-black outline-none" 
                placeholder="https://... or click Upload" 
              />
              <label className="bg-neutral-200 hover:bg-neutral-300 transition-colors text-black px-4 py-2 rounded-lg cursor-pointer flex items-center font-bold text-sm whitespace-nowrap">
                {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                Upload
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0], 'hero');
                    }
                  }} 
                />
              </label>
            </div>
            {heroImage && (
              <div className="mt-4 rounded-xl overflow-hidden h-40 w-full relative bg-neutral-100">
                <img src={heroImage} alt="Hero Preview" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 mb-8">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <Globe className="w-5 h-5 mr-3 text-neutral-500" />
              Featured Collections
            </h2>
            <button 
              type="button"
              onClick={addCollection}
              className="bg-neutral-100 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Collection
            </button>
          </div>

          <div className="space-y-6">
            {homeCollections.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">No collections added. The homepage will be empty.</p>
            ) : (
              homeCollections.map((collection, index) => (
                <div key={collection.id} className="border border-neutral-200 rounded-xl p-6 bg-neutral-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Collection {index + 1}</h3>
                    <button 
                      type="button" 
                      onClick={() => removeCollection(collection.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-neutral-500">Title</label>
                      <input 
                        type="text" 
                        value={collection.title} 
                        onChange={(e) => updateCollection(collection.id, 'title', e.target.value)} 
                        className="w-full border rounded-lg px-3 py-2 bg-white text-sm" 
                        placeholder="e.g. Men's Fashion" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-neutral-500">Link Category</label>
                      <select 
                        value={collection.link.replace('/products?category=', '')} 
                        onChange={(e) => updateCollection(collection.id, 'link', `/products?category=${e.target.value}`)} 
                        className="w-full border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:ring-2 focus:ring-black"
                        required 
                      >
                        <option value="" disabled>Select Root Category...</option>
                        {categories.filter(c => !c.parent).map(c => (
                          <option key={c._id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-neutral-500">Image</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={collection.image} 
                          onChange={(e) => updateCollection(collection.id, 'image', e.target.value)} 
                          className="flex-1 border rounded-lg px-3 py-2 bg-white text-sm" 
                          placeholder="https://... or click Upload" 
                          required 
                        />
                        <label className="bg-neutral-200 hover:bg-neutral-300 transition-colors text-black px-3 py-2 rounded-lg cursor-pointer flex items-center font-bold text-xs whitespace-nowrap">
                          {uploadingCollectionId === collection.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UploadCloud className="w-3 h-3 mr-1" />}
                          Upload
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageUpload(e.target.files[0], 'collection', collection.id);
                              }
                            }} 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {collection.image && (
                    <div className="mt-4 rounded-lg overflow-hidden h-24 w-32 relative bg-neutral-200 border border-neutral-300">
                      <img src={collection.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
             type="submit" 
             disabled={saving} 
             className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center hover:bg-neutral-800 disabled:opacity-50 transition-colors"
           >
             {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} 
             Save Homepage Layout
           </button>
           {success && <span className="text-green-600 flex items-center text-sm font-bold"><CheckCircle className="w-5 h-5 mr-2" /> Saved successfully</span>}
        </div>
      </form>
    </div>
  );
}
