import type { ReactNode } from "react";
import type { Settings } from "../data/types";
import { toWhatsappNumber } from "../lib/text";
import { formatHours, fullAddress, instagramUrl, phoneHref } from "../lib/restaurantInfo";
import { CardIcon, ClockIcon, InstagramIcon, PhoneIcon, PinIcon, StoreIcon, WhatsappIcon } from "../ui/icons";
import { Unconfirmed } from "./Hero";

export function InfoSection({ settings }: { settings: Settings }) {
  const s = settings;
  const services = [s.dineIn && "Consumo no local", s.pickup && "Retirada", s.delivery && "Entrega"].filter(Boolean) as string[];
  const tel = phoneHref(s);
  const insta = instagramUrl(s);
  const wa = s.whatsappConfirmed ? toWhatsappNumber(s.whatsapp) : null;

  return (
    <section id="informacoes" aria-labelledby="info-titulo" className="mx-auto mt-12 max-w-6xl px-4">
      <h2 id="info-titulo" className="text-2xl font-semibold sm:text-3xl">
        Informações
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {s.addressLine && (
          <InfoCard icon={<PinIcon />} title="Endereço" unconfirmed={!s.addressConfirmed}>
            <p>{fullAddress(s)}</p>
            {s.mapsUrl && (
              <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-3 min-h-11 text-sm">
                Abrir no Google Maps
              </a>
            )}
          </InfoCard>
        )}
        {s.hours.length > 0 && (
          <InfoCard icon={<ClockIcon />} title="Horário de funcionamento" unconfirmed={!s.hoursConfirmed}>
            <ul className="space-y-1">
              {s.hours.map((h, i) => (
                <li key={i}>{formatHours(h)}</li>
              ))}
            </ul>
            {s.hoursNote && <p className="mt-2 text-sm text-warmgray">{s.hoursNote}</p>}
          </InfoCard>
        )}
        {(tel || wa || insta) && (
          <InfoCard icon={<PhoneIcon />} title="Contato">
            <ul className="space-y-2">
              {tel && (
                <li>
                  <a href={tel} className="inline-flex min-h-11 items-center gap-2 font-medium underline-offset-2 hover:underline">
                    <PhoneIcon width={18} height={18} className="text-olive" /> {s.phone}
                  </a>
                  {!s.phoneConfirmed && <Unconfirmed />}
                </li>
              )}
              {wa && (
                <li>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium underline-offset-2 hover:underline">
                    <WhatsappIcon width={18} height={18} className="text-olive" /> WhatsApp
                  </a>
                </li>
              )}
              {insta && (
                <li>
                  <a href={insta} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium underline-offset-2 hover:underline">
                    <InstagramIcon width={18} height={18} className="text-olive" /> @{insta.split("/").filter(Boolean).pop()}
                  </a>
                  {!s.instagramConfirmed && <Unconfirmed />}
                </li>
              )}
            </ul>
          </InfoCard>
        )}
        {services.length > 0 && (
          <InfoCard icon={<StoreIcon />} title="Atendimento" unconfirmed={!s.servicesConfirmed}>
            <p>{services.join(" · ")}</p>
          </InfoCard>
        )}
        {s.paymentMethods.length > 0 && (
          <InfoCard icon={<CardIcon />} title="Formas de pagamento" unconfirmed={!s.paymentsConfirmed}>
            <p>{s.paymentMethods.join(" · ")}</p>
          </InfoCard>
        )}
      </div>
    </section>
  );
}

function InfoCard({ icon, title, unconfirmed, children }: { icon: ReactNode; title: string; unconfirmed?: boolean; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <h3 className="mb-2 flex flex-wrap items-center gap-2 font-sans text-base font-semibold">
        <span className="text-olive">{icon}</span>
        {title}
        {unconfirmed && <Unconfirmed />}
      </h3>
      <div className="text-brown/90">{children}</div>
    </div>
  );
}
