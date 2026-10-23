import type { Settings } from "../data/types";
import { formatHours } from "../lib/restaurantInfo";
import { ClockIcon, PinIcon } from "../ui/icons";

export function Hero({ settings }: { settings: Settings }) {
  const s = settings;
  return (
    <section id="inicio" className="relative overflow-hidden border-b border-line bg-cream-deep">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:py-12 md:grid-cols-[1.1fr_1fr] md:gap-10 md:py-16">
        <div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-olive-ink uppercase">{s.restaurantName}</p>
          <h1 className="text-[2rem] leading-tight font-semibold text-balance sm:text-5xl">{s.heroTitle}</h1>
          {s.heroSubtitle && <p className="mt-3 text-lg text-warmgray sm:text-xl">{s.heroSubtitle}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#cardapio" className="btn-primary px-7 text-lg">
              Ver cardápio
            </a>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-brown/90 sm:text-base">
            {s.hours.length > 0 && (
              <li className="flex items-start gap-2">
                <ClockIcon className="mt-0.5 shrink-0 text-olive" />
                <span>
                  {s.hours.map(formatHours).join(" · ")}
                  {!s.hoursConfirmed && <Unconfirmed />}
                </span>
              </li>
            )}
            {s.addressLine && (
              <li className="flex items-start gap-2">
                <PinIcon className="mt-0.5 shrink-0 text-olive" />
                <span>
                  {s.addressLine}
                  {s.district && ` — ${s.district}`}
                  {!s.addressConfirmed && <Unconfirmed />}
                </span>
              </li>
            )}
          </ul>
        </div>
        <HeroPicture settings={s} />
      </div>
    </section>
  );
}

export function Unconfirmed() {
  return <span className="chip ml-2 bg-white align-middle text-warmgray ring-1 ring-line">a confirmar</span>;
}

function HeroPicture({ settings }: { settings: Settings }) {
  if (settings.heroImageUrl) {
    return (
      <figure className="relative order-first aspect-[16/9] overflow-hidden rounded-3xl bg-cream shadow-sm md:order-none md:aspect-[4/3]">
        <img
          src={settings.heroImageUrl}
          alt={settings.heroImageIsPlaceholder ? "Imagem ilustrativa de comida caseira" : `Prato do ${settings.restaurantName}`}
          className="h-full w-full object-cover"
          fetchPriority="high"
          width={1200}
          height={900}
        />
        {settings.heroImageIsPlaceholder && (
          <figcaption className="chip absolute bottom-3 left-3 bg-white/90 text-warmgray">Imagem ilustrativa</figcaption>
        )}
      </figure>
    );
  }
  // Sem foto cadastrada: um desenho simples, que não se passa por fotografia.
  return (
    <div aria-hidden="true" className="hidden md:block">
      <svg viewBox="0 0 400 300" className="mx-auto w-full max-w-md">
        <circle cx="200" cy="160" r="120" fill="#FFFFFF" />
        <circle cx="200" cy="160" r="92" fill="#FFF8EF" stroke="#EADFCE" strokeWidth="4" />
        <ellipse cx="168" cy="146" rx="46" ry="32" fill="#FFFFFF" stroke="#EADFCE" strokeWidth="3" />
        <ellipse cx="236" cy="142" rx="42" ry="30" fill="#5B3A29" />
        <path d="M160 196c22-16 64-16 86 0-11 22-75 22-86 0z" fill="#68734A" />
        <path d="M150 40c-8 8 8 16 0 26M200 30c-8 8 8 16 0 26M250 40c-8 8 8 16 0 26" stroke="#B85C38" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".6" />
      </svg>
    </div>
  );
}
