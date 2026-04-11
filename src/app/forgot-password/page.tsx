"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "A reset link has been sent to your email.");
      } else {
        setError(data.error || "An error occurred. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter mb-2">{t("auth.forgotTitle")}</h1>
          <p className="text-neutral-500 font-medium text-sm">{t("auth.forgotDesc")}</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 font-medium text-center">{error}</div>}
        {message && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-6 font-medium text-center">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-5 text-start">
          <div>
            <label className="block text-sm font-semibold mb-2">{t("checkout.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-neutral-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold rounded-lg py-3 mt-4 hover:bg-neutral-800 transition-colors flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-neutral-600">
          Remember your password?{" "}
          <Link href="/login" className="text-black hover:underline font-semibold mx-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
