import type { IpData } from "./worker";

// The browser view of ip.coreymark.com, styled to match coreymark.com.
//
// Everything is inline: no scripts, no external stylesheets, fonts or images,
// and nothing is requested from coreymark.com. The colors are the site's Slate
// theme (coreymark-site/src/styles/global.css). The site's Red Hat fonts are not
// shipped here, so the stacks fall back to system fonts. The visitor's saved
// theme lives in coreymark.com's localStorage, which this origin cannot read,
// so the page is always Slate.

const SITE_TOOL_URL = "https://coreymark.com/lab/whatsmyip/";
const SOURCE_URL = "https://github.com/coreywininger/coreymark-ip-worker";

const CSS = `
:root {
  color-scheme: dark;
  --bg: #101822; --surface: #16212C; --surface2: #121C26;
  --line: #243243; --line2: #2F3F51;
  --text: #DCE4EB; --text2: #B0BDCA; --text3: #8B9DAE;
  --red: #E38D95; --green: #7FCCA5; --yellow: #DDBC7E; --cyan: #76CCBF;
  --accent: var(--cyan);
  --font-head: "Red Hat Display", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-body: "Red Hat Text", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Red Hat Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh;
  background-color: var(--bg); color: var(--text);
  font: 17px/1.6 var(--font-body);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.bg { position: absolute; inset: 0 0 auto 0; height: 560px; z-index: -1; pointer-events: none; overflow: hidden; }
.backdrop {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 0%, transparent 75%);
  mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 0%, transparent 75%);
  opacity: 0.5;
}
.glow {
  position: absolute; top: -120px; left: 50%;
  width: 620px; height: 420px; margin-left: -310px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 16%, transparent), transparent);
}
a { color: var(--accent); text-underline-offset: 3px; }
a:hover { color: var(--text); }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
.wrap { max-width: 820px; margin: 0 auto; padding: 0 32px; }

.site-header { border-bottom: 1px solid var(--line); }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 14px; }
.brand { display: flex; align-items: center; gap: 12px; min-height: 44px; min-width: 0; color: var(--text); text-decoration: none; }
.keycap {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 9px;
  background: var(--surface); border: 1px solid var(--line2);
  box-shadow: 0 2px 0 var(--line2);
  font: 700 15px/1 var(--font-mono); color: var(--text);
  transition: transform 200ms ease;
}
.keycap .gt { color: var(--green); }
.brand:hover .keycap { transform: rotate(-8deg) scale(1.08); }
.brand-text { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.brand-name { font: 700 19px/1.15 var(--font-head); letter-spacing: -0.01em; white-space: nowrap; }
.brand-sub { font: 12px/1.3 var(--font-mono); color: var(--text2); }
.cursor {
  display: inline-block; width: 9px; height: 3px; margin-left: 4px;
  background: var(--accent); vertical-align: baseline;
  animation: blink 1.1s steps(1) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
.back {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px;
  border: 1px solid var(--line2); border-radius: 8px;
  font: 14px/1 var(--font-mono); color: var(--text2); text-decoration: none; white-space: nowrap;
  transition: color 150ms ease, border-color 150ms ease;
}
.back:hover { color: var(--text); border-color: var(--accent); }

main { padding-block: 40px 56px; }
.crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 0 0 6px -6px; padding: 0; list-style: none; font: 14px/1 var(--font-mono); color: var(--text3); }
.crumb { display: inline-flex; align-items: center; min-height: 44px; padding: 0 6px; border-radius: 6px; color: var(--text3); text-decoration: none; }
a.crumb:hover { color: var(--text); background: color-mix(in srgb, var(--text) 8%, transparent); }
.crumb[aria-current] { color: var(--accent); }
h1 { margin: 0 0 10px; font: 800 clamp(30px, 6vw, 44px)/1.1 var(--font-head); letter-spacing: -0.02em; }
h1 .prompt { color: var(--green); font-family: var(--font-mono); font-weight: 600; }
.lede { margin: 0 0 28px; max-width: 60ch; color: var(--text2); }

.panel { border: 1px solid var(--line2); border-radius: 14px; background: var(--surface); overflow: hidden; }
.panel + .panel { margin-top: 20px; }
.panel-strip {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 16px; border-bottom: 1px solid var(--line);
  background: var(--surface2); font: 13px/1.3 var(--font-mono); color: var(--text3);
}
.dots { display: inline-flex; gap: 6px; flex: none; }
.dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--line2); }
.dots i:nth-child(1) { background: var(--red); }
.dots i:nth-child(2) { background: var(--yellow); }
.dots i:nth-child(3) { background: var(--green); }
.strip-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel-body { padding: 22px 28px 24px; }

.label { margin: 0 0 4px; font: 12px/1.4 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); }
.ip { margin: 0 0 22px; font: 600 clamp(24px, 6.4vw, 40px)/1.15 var(--font-mono); color: var(--accent); overflow-wrap: anywhere; }
dl { margin: 0; }
.row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 4px 20px; padding: 9px 0; border-top: 1px solid var(--line); }
dt { font: 13px/1.6 var(--font-mono); color: var(--text3); }
dd { margin: 0; font: 15px/1.6 var(--font-mono); color: var(--text); overflow-wrap: anywhere; }
dd .dim { color: var(--text2); }
dd a { display: inline-flex; align-items: center; }
.chip { display: inline-block; padding: 1px 8px; border: 1px solid var(--line2); border-radius: 999px; font-size: 13px; color: var(--text2); }
.chip[data-on] { border-color: color-mix(in srgb, var(--green) 55%, transparent); color: var(--green); }

.panel-body.term { padding-block: 16px; }
pre { margin: 0; overflow-x: auto; font: 14px/1.9 var(--font-mono); color: var(--text); }
pre .prompt { color: var(--green); user-select: none; }
pre .note { color: var(--text3); }

footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 20px; font: 13px/1.6 var(--font-mono); color: var(--text3); }
footer p { margin: 0; }
footer .prompt { color: var(--green); }
footer nav { display: flex; gap: 4px 18px; flex-wrap: wrap; }
footer a { display: inline-flex; align-items: center; min-height: 44px; color: var(--text2); }
footer a:hover { color: var(--text); }

@media (max-width: 640px) {
  .wrap { padding: 0 16px; }
  main { padding-block: 24px 40px; }
  .brand-name { font-size: 17px; }
  .back .long { display: none; }
  .panel-body { padding: 16px 16px 18px; }
  .row { grid-template-columns: 1fr; gap: 0; padding: 8px 0; }
  dt { font-size: 12px; }
  .strip-note, pre .note { display: none; }
  /* Coordinates: the map link goes on its own line, with no dangling separator. */
  dd .sep { display: none; }
  dd .long-num { font-size: min(12.5px, 3.3vw); white-space: nowrap; }
  dd a[data-map-link] { display: flex; width: fit-content; }
}
@media (hover: none), (pointer: coarse), (max-width: 640px) {
  dd a { min-height: 44px; }
  /* Wider hit area, same visible spacing: padding with an equal negative margin. */
  a.crumb { padding-inline: 18px; margin-inline: -12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .brand:hover .keycap { transform: none; }
}
`;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// An IPv6 address may wrap after a colon, so its groups stay whole. <wbr> adds
// no characters: the element's text is still the address.
const breakableIp = (ip: string) => escapeHtml(ip).replace(/:/g, ":<wbr>");

function row(field: string, label: string, valueHtml: string): string {
  return `<div class="row" data-field="${field}"><dt>${label}</dt><dd>${valueHtml}</dd></div>`;
}

export function renderHtml(data: IpData): string {
  const dash = `<span class="dim">—</span>`;
  const val = (s: string) => (s ? escapeHtml(s) : dash);

  const lat = data.latitude;
  const lon = data.longitude;
  const coords =
    lat != null && lon != null
      ? `${lat.toFixed(4)}, ${lon.toFixed(4)} <span class="dim sep">·</span> <a href="https://www.openstreetmap.org/?mlat=${lat.toFixed(4)}&mlon=${lon.toFixed(4)}#map=11/${lat.toFixed(4)}/${lon.toFixed(4)}" target="_blank" rel="noopener" data-map-link>View on OpenStreetMap</a>`
      : dash;
  const asn = data.asn
    ? `${escapeHtml(data.asn)}${data.asn_org ? ` <span class="dim">· ${escapeHtml(data.asn_org)}</span>` : ""}`
    : dash;
  const eu = `<span class="chip"${data.is_eu ? " data-on" : ""}>${data.is_eu ? "true" : "false"}</span>`;

  const rows = [
    // An IPv6 decimal is up to 39 digits with nowhere sensible to break, so on
    // phones it is set smaller to stay on one line.
    row("ip_decimal", "IP (decimal)", data.ip_decimal.length > 20 ? `<span class="long-num">${val(data.ip_decimal)}</span>` : val(data.ip_decimal)),
    row("country_name", "Country", val(data.country_name)),
    row("country", "Country (ISO)", val(data.country)),
    row("is_eu", "In EU?", eu),
    row("region", "Region", val(data.region)),
    row("region_code", "Region code", val(data.region_code)),
    row("metro_code", "Metro code", data.metro_code != null ? String(data.metro_code) : dash),
    row("city", "City", val(data.city)),
    row("postal", "Postal", val(data.postal)),
    row("coordinates", "Coordinates", coords),
    row("time_zone", "Timezone", val(data.time_zone)),
    row("asn", "ASN", asn),
    row("colo", "CF colo", val(data.colo)),
    row("user_agent", "User-Agent", val(data.user_agent)),
  ].join("\n        ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ip.coreymark.com — what's my IP?</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#101822">
<style>${CSS}</style>
</head>
<body>
<div class="bg" aria-hidden="true"><div class="backdrop"></div><div class="glow"></div></div>
<header class="site-header" data-ip-header>
  <div class="wrap bar">
    <a href="https://coreymark.com/" class="brand" data-brand>
      <span class="keycap" aria-hidden="true"><span class="gt">&gt;</span>_</span>
      <span class="brand-text">
        <span class="brand-name">Corey Wininger<span class="cursor" aria-hidden="true"></span></span>
        <span class="brand-sub">ip.coreymark.com</span>
      </span>
    </a>
    <a href="${SITE_TOOL_URL}" class="back" data-site-link><span aria-hidden="true">←&nbsp;</span><span class="long">coreymark.com/lab/</span>whatsmyip</a>
  </div>
</header>
<main class="wrap">
  <nav aria-label="Breadcrumb">
    <ol class="crumbs">
      <li><a class="crumb" href="https://coreymark.com/">~</a></li><li aria-hidden="true">/</li>
      <li><a class="crumb" href="https://coreymark.com/lab/">lab</a></li><li aria-hidden="true">/</li>
      <li><span class="crumb" aria-current="page">ip</span></li>
    </ol>
  </nav>
  <h1><span class="prompt" aria-hidden="true">$ </span>what's my IP?</h1>
  <p class="lede">What this server sees when your request arrives.</p>

  <section class="panel" aria-labelledby="ip-label" data-ip-panel>
    <div class="panel-strip" aria-hidden="true">
      <span class="dots"><i></i><i></i><i></i></span>
      <span class="strip-title">curl ip.coreymark.com/json</span>
      <span class="strip-note">not logged · not cached</span>
    </div>
    <div class="panel-body">
      <p class="label" id="ip-label">Your public IP</p>
      <p class="ip" data-ip>${data.ip ? breakableIp(data.ip) : "—"}</p>
      <dl data-ip-fields>
        ${rows}
      </dl>
    </div>
  </section>

  <section class="panel" aria-labelledby="term-label" data-ip-usage>
    <div class="panel-strip">
      <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="strip-title" id="term-label">Designed for terminals</span>
    </div>
    <div class="panel-body term">
<pre tabindex="0" aria-label="Example commands"><span class="prompt">$ </span>curl ip.coreymark.com          <span class="note"># your IP</span>
<span class="prompt">$ </span>curl ip.coreymark.com/ip
<span class="prompt">$ </span>curl ip.coreymark.com/json     <span class="note"># everything on this page</span>
<span class="prompt">$ </span>curl ip.coreymark.com/country
<span class="prompt">$ </span>curl ip.coreymark.com/asn</pre>
    </div>
  </section>

  <footer>
    <p><span class="prompt" aria-hidden="true">$ </span>No request data is logged.</p>
    <nav aria-label="Links">
      <a href="${SITE_TOOL_URL}" data-site-link>What's my IP on coreymark.com</a>
      <a href="${SOURCE_URL}" data-source-link>Source</a>
    </nav>
  </footer>
</main>
</body>
</html>`;
}
