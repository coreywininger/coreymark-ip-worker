import { EU_COUNTRY_CODES } from "./eu";
import { ipToDecimal } from "./ip-decimal";

export interface Env {}

interface IpData {
  ip: string;
  ip_decimal: string;
  country: string;
  country_name: string;
  is_eu: boolean;
  region: string;
  region_code: string;
  metro_code: number | null;
  city: string;
  postal: string;
  latitude: number | null;
  longitude: number | null;
  time_zone: string;
  asn: string;
  asn_org: string;
  continent: string;
  colo: string;
  user_agent: string;
}

const NO_CACHE = "no-store";

// Wide-open CORS — this is a public read-only API in the spirit of ifconfig.co.
// The per-IP rate limit (60/min, configured at the CF edge) bounds abuse; we never
// return data the caller didn't already supply, so there's nothing privileged to
// gatekeep behind an Origin allowlist.
const CORS_ALLOW_ORIGIN = "*";

const regionDisplay = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(iso: string): string {
  if (!iso) return "";
  try {
    return regionDisplay.of(iso) ?? "";
  } catch {
    return "";
  }
}

function buildData(request: Request): IpData {
  const cf = (request.cf ?? {}) as IncomingRequestCfProperties;
  const ip = request.headers.get("CF-Connecting-IP") ?? "";
  const ua = request.headers.get("User-Agent") ?? "";
  const asnNum = cf.asn;
  const country = cf.country ?? "";
  const metroRaw = (cf as unknown as { metroCode?: string | number }).metroCode;
  const metroParsed = metroRaw != null ? Number(metroRaw) : NaN;
  return {
    ip,
    ip_decimal: ipToDecimal(ip),
    country,
    country_name: countryName(country),
    is_eu: country ? EU_COUNTRY_CODES.has(country) : false,
    region: cf.region ?? "",
    region_code: cf.regionCode ?? "",
    metro_code: Number.isFinite(metroParsed) ? metroParsed : null,
    city: cf.city ?? "",
    postal: cf.postalCode ?? "",
    latitude: cf.latitude ? Number(cf.latitude) : null,
    longitude: cf.longitude ? Number(cf.longitude) : null,
    time_zone: cf.timezone ?? "",
    asn: asnNum ? `AS${asnNum}` : "",
    asn_org: cf.asOrganization ?? "",
    continent: cf.continent ?? "",
    colo: cf.colo ?? "",
    user_agent: ua,
  };
}

function text(body: string, status = 200): Response {
  return new Response(body + "\n", {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_CACHE,
      "access-control-allow-origin": CORS_ALLOW_ORIGIN,
    },
  });
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2) + "\n", {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": NO_CACHE,
      "access-control-allow-origin": CORS_ALLOW_ORIGIN,
    },
  });
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": NO_CACHE,
      "access-control-allow-origin": CORS_ALLOW_ORIGIN,
    },
  });
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": CORS_ALLOW_ORIGIN,
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": "*",
      "access-control-max-age": "86400",
    },
  });
}

function prefersText(request: Request): boolean {
  const ua = (request.headers.get("User-Agent") ?? "").toLowerCase();
  if (/^(curl|wget|httpie|fetch|libcurl|powershell|python-requests)/.test(ua)) return true;
  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("text/html")) return false;
  if (accept.includes("application/json")) return false;
  if (accept.includes("text/plain")) return true;
  return false;
}

function prefersJson(request: Request): boolean {
  const accept = request.headers.get("Accept") ?? "";
  return accept.includes("application/json");
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => { out[k] = v; });
  return out;
}

function renderHtml(data: IpData): string {
  const safe = (s: string) => s.replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
  const lat = data.latitude;
  const lon = data.longitude;
  const coordsLine = (lat != null && lon != null)
    ? `${lat.toFixed(4)}, ${lon.toFixed(4)} · <a href="https://www.openstreetmap.org/?mlat=${lat.toFixed(4)}&mlon=${lon.toFixed(4)}#map=11/${lat.toFixed(4)}/${lon.toFixed(4)}" target="_blank" rel="noopener">View on OpenStreetMap</a>`
    : "—";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ip.coreymark.com — what's my IP?</title>
<meta name="robots" content="noindex">
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem 1.25rem; max-width: 720px; margin-inline: auto; }
  h1 { font-size: 1.1rem; margin: 0 0 1rem; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; opacity: 0.7; }
  .ip { font: 600 2.25rem/1.1 ui-monospace, "SF Mono", Menlo, monospace; margin: 0 0 1.5rem; word-break: break-all; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.35rem 1.25rem; margin: 0 0 1.5rem; }
  dt { opacity: 0.6; font-size: 0.875rem; }
  dd { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.875rem; word-break: break-word; }
  dd.wrap { word-break: break-all; }
  code { font: 0.875rem/1.45 ui-monospace, "SF Mono", Menlo, monospace; }
  pre { background: color-mix(in srgb, currentColor 8%, transparent); padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8125rem; }
  footer { margin-top: 2rem; font-size: 0.8125rem; opacity: 0.6; }
  a { color: inherit; }
</style>
</head>
<body>
<h1>ip.coreymark.com</h1>
<p class="ip">${safe(data.ip || "—")}</p>
<dl>
  <dt>IP (decimal)</dt><dd class="wrap">${safe(data.ip_decimal || "—")}</dd>
  <dt>Country</dt><dd>${safe(data.country_name || "—")}</dd>
  <dt>Country (ISO)</dt><dd>${safe(data.country || "—")}</dd>
  <dt>In EU?</dt><dd>${data.is_eu ? "true" : "false"}</dd>
  <dt>Region</dt><dd>${safe(data.region || "—")}</dd>
  <dt>Region code</dt><dd>${safe(data.region_code || "—")}</dd>
  <dt>Metro code</dt><dd>${data.metro_code != null ? data.metro_code : "—"}</dd>
  <dt>City</dt><dd>${safe(data.city || "—")}</dd>
  <dt>Postal</dt><dd>${safe(data.postal || "—")}</dd>
  <dt>Coordinates</dt><dd>${coordsLine}</dd>
  <dt>Timezone</dt><dd>${safe(data.time_zone || "—")}</dd>
  <dt>ASN</dt><dd>${safe(data.asn)} ${data.asn_org ? `· ${safe(data.asn_org)}` : ""}</dd>
  <dt>CF colo</dt><dd>${safe(data.colo || "—")}</dd>
  <dt>User-Agent</dt><dd class="wrap">${safe(data.user_agent || "—")}</dd>
</dl>
<p><strong>Designed for terminals.</strong></p>
<pre>$ curl ip.coreymark.com
$ curl ip.coreymark.com/ip
$ curl ip.coreymark.com/json
$ curl ip.coreymark.com/country
$ curl ip.coreymark.com/asn</pre>
<footer>No request data is logged. <a href="https://github.com/coreywininger/coreymark-ip-worker">Source</a>.</footer>
</body>
</html>`;
}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return corsPreflight();

    const url = new URL(request.url);
    const data = buildData(request);

    switch (url.pathname) {
      case "/":
        if (prefersJson(request)) return json(data);
        if (prefersText(request)) return text(data.ip);
        return html(renderHtml(data));
      case "/ip":
        return text(data.ip);
      case "/ip/decimal":
        return text(data.ip_decimal);
      case "/json":
      case "/all.json":
        return json(data);
      case "/country":
        return text(data.country_name);
      case "/country-iso":
        return text(data.country);
      case "/eu":
        return text(String(data.is_eu));
      case "/city":
        return text(data.city);
      case "/asn":
        return text(data.asn);
      case "/ua":
        return text(data.user_agent);
      case "/headers":
        return json(headersToObject(request.headers));
      case "/health":
        return text("ok");
      default:
        return text("not found", 404);
    }
  },
} satisfies ExportedHandler<Env>;
