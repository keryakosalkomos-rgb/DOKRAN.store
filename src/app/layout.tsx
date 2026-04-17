import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import Providers from "@/components/Providers";
import FloatingChat from "@/components/ui/FloatingChat";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import CartSync from "@/components/cart/CartSync";
import FloatingContact from "@/components/ui/FloatingContact";
import { adminDb } from "@/lib/firebaseAdmin";
import { formatWaLink, formatPhoneLink, formatSocialLink } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });
const cairo = Cairo({ subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "DOK-RAN | Premium Fashion & Custom Designs",
  description: "Men & Women Fashion Store, Full Manufacturing System.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLocale();
  const translations = await getTranslations();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const fontClass = lang === "ar" ? cairo.className : inter.className;

  let contactLinks = {
    whatsapp: "https://wa.me/201210275442",
    phone: "01069478867",
    facebook: "https://www.facebook.com/share/17Wnvqb4Se/",
    tiktok: "https://www.tiktok.com/@dokran.wears?_r=1&_t=ZS-95c6O0sdkD2"
  };
  
  try {
    const db = adminDb();
    const snap = await db.collection("settings").doc("payment").get();
    if (snap.exists) {
      const data = snap.data();
      if (data?.contactWhatsApp) contactLinks.whatsapp = data.contactWhatsApp;
      if (data?.contactPhone) contactLinks.phone = data.contactPhone;
      if (data?.contactFacebook) contactLinks.facebook = data.contactFacebook;
      if (data?.contactTikTok) contactLinks.tiktok = data.contactTikTok;
    }
  } catch (error) {
    console.error("Failed to fetch contact settings", error);
  }

  return (
    <html lang={lang} dir={dir}>
      <body className={`${fontClass} min-h-screen flex flex-col pt-16`}>
        <Providers>
          <LanguageProvider lang={lang} translations={translations}>
            <Navbar />
            <main className="flex-grow">{children}</main>
            <FloatingChat />
            <FloatingContact links={contactLinks} />
            <InstallPrompt />
            <CartSync />
            <footer className="bg-neutral-900 text-white py-12 px-6 mt-12 border-t border-white/10">
              <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
                {/* Contact Links */}
                <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm font-medium">
                  <a href={formatPhoneLink(contactLinks.phone)} className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                    <span className="p-2 bg-white/10 rounded-full">📞</span>
                    {translations["contact.phone"] || "Call Us"}
                  </a>
                  <a href={formatWaLink(contactLinks.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-green-400 transition-colors">
                    <span className="p-2 bg-white/10 rounded-full">💬</span>
                    {translations["contact.whatsapp"] || "WhatsApp"}
                  </a>
                  <a href={formatSocialLink(contactLinks.facebook)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                    <span className="p-2 bg-white/10 rounded-full">🌐</span>
                    {translations["contact.facebook"] || "Facebook"}
                  </a>
                </div>
                
                <p className="text-sm opacity-50">
                  © {new Date().getFullYear()} {translations["footer.rights"] || "DOKRAN. All rights reserved."}
                </p>
              </div>
            </footer>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
