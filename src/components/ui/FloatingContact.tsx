"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Phone } from "lucide-react";
import { motion } from "framer-motion";
import { formatWaLink, formatPhoneLink, formatSocialLink } from "@/lib/utils";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FbContactIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.791-4.667 4.53-4.667 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-.9 4.46-2.43 6.07-1.57 1.63-3.86 2.59-6.14 2.54-2.88-.04-5.63-1.47-7.23-3.82-1.54-2.28-2.02-5.18-1.29-7.85.73-2.6 2.5-4.81 4.88-5.87 2.16-.96 4.67-1.02 6.88-.23v4.11c-1.39-.77-3.13-.86-4.59-.3-1.4.52-2.48 1.68-2.91 3.12-.41 1.34-.18 2.87.64 4.02.83 1.16 2.22 1.83 3.65 1.87 1.7.04 3.4-.66 4.54-1.93 1.16-1.27 1.8-3.03 1.8-4.78.01-6.66.01-13.32.01-19.98.02z" />
  </svg>
);

export default function FloatingContact({ links }: { links?: any }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";

  const defaultLinks = {
    whatsapp: "https://wa.me/201210275442",
    phone: "01069478867",
    facebook: "https://www.facebook.com/share/17Wnvqb4Se/",
    tiktok: "https://www.tiktok.com/@dokran.wears?_r=1&_t=ZS-95c6O0sdkD2"
  };

  const activeLinks = links || defaultLinks;

  const contacts = [
    {
      id: "whatsapp",
      icon: <WhatsAppIcon className="w-6 h-6" />,
      label: t("contact.whatsapp"),
      href: formatWaLink(activeLinks.whatsapp),
      color: "bg-[#25D366]",
    },
    {
      id: "phone",
      icon: <Phone className="w-6 h-6" />,
      label: t("contact.phone"),
      href: formatPhoneLink(activeLinks.phone),
      color: "bg-blue-600",
    },
    {
      id: "facebook",
      icon: <FbContactIcon className="w-6 h-6" />,
      label: t("contact.facebook"),
      href: formatSocialLink(activeLinks.facebook),
      color: "bg-[#1877F2]",
    },
    {
      id: "tiktok",
      icon: <TikTokIcon className="w-5 h-5" />,
      label: t("contact.tiktok"),
      href: formatSocialLink(activeLinks.tiktok),
      color: "bg-black",
    },
  ];

  return (
    <div 
      className={`fixed bottom-6 ${isRTL ? "right-6" : "left-6"} z-[60] flex flex-col gap-3 group`}
    >
      {contacts.map((contact, idx) => (
        <motion.a
          key={contact.id}
          href={contact.href}
          target={contact.id !== "phone" ? "_blank" : undefined}
          rel={contact.id !== "phone" ? "noopener noreferrer" : undefined}
          initial={{ opacity: 0, scale: 0, x: isRTL ? 20 : -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ 
            delay: idx * 0.1,
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`${contact.color} text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center relative group/btn`}
          title={contact.label}
        >
          {contact.icon}
          
          {/* Label Tooltip */}
          <span className={`absolute ${isRTL ? "right-full mr-3" : "left-full ml-3"} whitespace-nowrap bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none`}>
            {contact.label}
          </span>
        </motion.a>
      ))}
    </div>
  );
}
