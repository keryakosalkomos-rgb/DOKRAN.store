import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWaLink(val: string) {
  if (!val) return "";
  const cleaned = val.trim();
  if (cleaned.startsWith("http")) return cleaned;
  if (/^[\d+\s]+$/.test(cleaned)) {
    let num = cleaned.replace(/\s/g, '');
    if (num.startsWith('01')) num = '2' + num;
    return `https://wa.me/${num.replace('+', '')}`;
  }
  return `https://${cleaned}`;
}

export function formatSocialLink(val: string) {
  if (!val) return "";
  const cleaned = val.trim();
  if (cleaned.startsWith("http")) return cleaned;
  return `https://${cleaned}`;
}

export function formatPhoneLink(val: string) {
  if (!val) return "";
  const cleaned = val.trim();
  if (cleaned.startsWith("tel:") || cleaned.startsWith("http")) return cleaned;
  return `tel:${cleaned}`;
}
