import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Field } from "./SettingsPanel";
import { Alert, Panel } from "./ui";

/** Endereço público do cardápio: o de config.js, ou a pasta acima do painel. */
function defaultUrl(configured: string): string {
  if (configured) return configured;
  return new URL("../", window.location.href).href;
}

export function QrPanel({ publicUrl, restaurantName }: { publicUrl: string; restaurantName: string }) {
  const [url, setUrl] = useState(defaultUrl(publicUrl));
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!/^https?:\/\/\S+$/.test(url)) {
      setError("Informe um endereço completo, começando com https://");
      return;
    }
    setError("");
    const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#3D2A20", light: "#FFFFFF" } };
    QRCode.toDataURL(url, { ...options, width: 1024 }).then(setPng).catch(() => setError("Não foi possível gerar o QR Code."));
    QRCode.toString(url, { ...options, type: "svg" }).then(setSvg).catch(() => {});
  }, [url]);

  const svgHref = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";
  const isLocal = /localhost|127\.0\.0\.1/.test(url);

  return (
    <Panel title="QR Code do cardápio" description="Imprima para as mesas, cartões e materiais de divulgação. O QR Code abre o endereço abaixo; mudar pratos e preços não muda o endereço.">
      <div className="space-y-3 print:hidden">
        <Field label="Endereço do cardápio" id="qr-url">
          <input id="qr-url" className="field" type="url" value={url} onChange={(e) => setUrl(e.target.value.trim())} />
        </Field>
        {isLocal && <Alert kind="info">Este é um endereço de teste (localhost) e não abre no celular dos clientes.</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
      </div>
      {png && !error && (
        <>
          <div className="mt-5 flex justify-center">
            {/* Plaquinha de mesa: é a única parte da página que sai na impressão. */}
            <div id="plaquinha" className="w-72 rounded-3xl border-2 border-brown/15 bg-white p-6 text-center print:w-[9cm] print:border-brown/40">
              <p className="font-serif text-2xl font-semibold">{restaurantName}</p>
              <p className="mt-1 text-sm text-warmgray">Cardápio digital</p>
              <img src={png} alt={`QR Code para ${url}`} className="mx-auto mt-4 w-full" />
              <p className="mt-3 text-sm font-semibold">Aponte a câmera do celular</p>
              <p className="mt-1 text-xs break-all text-warmgray">{url.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Imprimir plaquinha
            </button>
            <a className="btn-secondary" href={png} download="cardapio-qrcode.png">
              Baixar PNG
            </a>
            {svgHref && (
              <a className="btn-secondary" href={svgHref} download="cardapio-qrcode.svg">
                Baixar SVG (gráfica)
              </a>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-warmgray print:hidden">Antes de imprimir em quantidade, teste o QR Code com dois ou três celulares diferentes.</p>
        </>
      )}
    </Panel>
  );
}
