import type { OpeningHours, Settings } from "../data/types";
import { digits, instagramHandle } from "./text";

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "11:30" → "11h30", "14:00" → "14h". */
export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** [1,2,3,4,5] → "Segunda a sexta"; [1,3,5] → "Segunda, quarta e sexta". */
export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Todos os dias";
  const names = sorted.map((d) => WEEKDAYS[d]!.toLowerCase());
  const first = sorted[0]!;
  const consecutive = sorted.every((d, i) => d === first + i);
  let text: string;
  if (sorted.length >= 3 && consecutive) text = `${names[0]} a ${names[names.length - 1]}`;
  else if (names.length === 1) text = names[0]!;
  else text = `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatHours(h: OpeningHours): string {
  return `${formatDays(h.days)}, das ${formatTime(h.opens)} às ${formatTime(h.closes)}`;
}

export function fullAddress(s: Settings): string {
  const parts = [s.addressLine, s.district, [s.city, s.state].filter(Boolean).join(" – ")].filter(Boolean);
  return parts.join(", ") + (s.postalCode ? `, CEP ${s.postalCode}` : "");
}

export function instagramUrl(s: Settings): string | null {
  const handle = instagramHandle(s.instagram);
  return handle ? `https://www.instagram.com/${handle}/` : null;
}

export function phoneHref(s: Settings): string | null {
  const d = digits(s.phone);
  if (d.length < 10) return null;
  return `tel:+${d.length <= 11 ? "55" + d : d}`;
}

/**
 * Dados estruturados (schema.org/Restaurant) apenas com as informações que o restaurante
 * marcou como confirmadas no painel.
 */
export function restaurantJsonLd(s: Settings, pageUrl: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: s.restaurantName,
    url: pageUrl,
    hasMenu: pageUrl,
  };
  if (s.addressConfirmed && s.addressLine) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: s.addressLine,
      addressLocality: s.city,
      addressRegion: s.state,
      postalCode: s.postalCode,
      addressCountry: "BR",
    };
  }
  const tel = phoneHref(s);
  if (s.phoneConfirmed && tel) data.telephone = tel.replace("tel:", "");
  if (s.hoursConfirmed && s.hours.length > 0) {
    data.openingHoursSpecification = s.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => SCHEMA_DAYS[d]),
      opens: h.opens,
      closes: h.closes,
    }));
  }
  const insta = instagramUrl(s);
  if (s.instagramConfirmed && insta) data.sameAs = [insta];
  return data;
}
