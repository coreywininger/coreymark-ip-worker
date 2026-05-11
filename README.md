# coreymark-ip-worker

Cloudflare Worker behind [ip.coreymark.com](https://ip.coreymark.com) — request inspection in the spirit of [ifconfig.co](https://ifconfig.co).

## Endpoints

| Path | Content-type | Description |
|---|---|---|
| `/` | negotiated | Plain text for curl/wget/httpie, HTML for browsers, JSON if `Accept: application/json` |
| `/ip` | text/plain | Just the client IP |
| `/ip/decimal` | text/plain | IP as a base-10 integer (uint32 for v4, 128-bit for v6) |
| `/json` | application/json | Full structured payload |
| `/country` | text/plain | Country name (localized, en) |
| `/country-iso` | text/plain | ISO 3166-1 alpha-2 country code |
| `/eu` | text/plain | `true` if country is an EU member state, else `false` |
| `/city` | text/plain | City name (best effort, CF geo) |
| `/asn` | text/plain | Autonomous System Number, formatted `ASxxxxx` |
| `/ua` | text/plain | The User-Agent header you sent |
| `/headers` | application/json | Inbound request headers as a JSON object |

The `/json` payload includes additional fields not exposed as individual endpoints: `region`, `region_code`, `metro_code` (US only), `postal`, `latitude`, `longitude`, `time_zone`, `asn_org`, `continent`, `colo`.

## Privacy

- No request data is logged or persisted server-side. Cloudflare's edge metrics (request counts, geo, status codes) are visible at the zone level only.
- All responses include `Cache-Control: no-store`.
- The Worker makes zero outbound calls — the entire payload is derived from `request.cf` + headers + pure computation.

## CORS

All responses include `Access-Control-Allow-Origin: *`. The Worker is intentionally usable from any browser origin — same as ifconfig.co's open API model. The per-IP rate limit at the Cloudflare edge bounds abuse, and the Worker never returns data the caller didn't already supply, so there's nothing privileged to gatekeep.

## Stack

- Cloudflare Workers (TypeScript)
- Wrangler 3
- Rate-limited at the edge (Cloudflare Rate Limiting Rule)

## Develop

```bash
npm install
npm run dev      # http://localhost:8787
npm test
```

## Deploy

```bash
CLOUDFLARE_API_TOKEN=... npm run deploy
```
