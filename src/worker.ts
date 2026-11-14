import { EU_COUNTRY_CODES } from "./eu";
import { ipToDecimal } from "./ip-decimal";
import { renderHtml } from "./html";

export interface Env {}

export interface IpData {
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
