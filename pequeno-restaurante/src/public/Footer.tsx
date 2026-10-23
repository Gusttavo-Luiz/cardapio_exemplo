import type { Settings } from "../data/types";
import { instagramUrl, phoneHref } from "../lib/restaurantInfo";

export function Footer({ settings, base = "./" }: { settings: Settings; base?: string }) {
  const s = settings;
  const tel = s.phoneConfirmed ? phoneHref(s) : null;
  const insta = s.instagramConfirmed ? instagramUrl(s) : null;
  return (
    <footer className="mt-14 border-t border-line bg-cream-deep">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-sm text-warmgray">
        <p className="font-serif text-lg font-semibold text-brown">{s.restaurantName}</p>
        {s.addressLine && (
          <p>
            {s.addressLine}
            {s.district && ` — ${s.district}`}
            {s.city && `, ${s.city}`}
          </p>
        )}
        {(tel || insta) && (
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {tel && (
              <a className="underline underline-offset-2" href={tel}>
                {s.phone}
              </a>
            )}
            {insta && (
              <a className="underline underline-offset-2" href={insta} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            )}
          </p>
        )}
        <p>Preços e disponibilidade podem mudar sem aviso prévio. Os pedidos são confirmados pelo restaurante.</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a className="underline underline-offset-2" href={`${base}privacidade/`}>
            Política de privacidade
          </a>
          {s.privacyController && <span>Responsável pelos dados: {s.privacyController}</span>}
        </p>
      </div>
    </footer>
  );
}
