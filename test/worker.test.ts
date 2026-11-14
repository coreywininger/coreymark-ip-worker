import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { ipToDecimal } from "../src/ip-decimal";
import { EU_COUNTRY_CODES } from "../src/eu";

describe("ip.coreymark.com worker — routing", () => {
  it("/ip returns plain text", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/ip");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("/json returns application/json with the full field set", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/json");
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json() as Record<string, unknown>;
    const expected = [
      "ip", "ip_decimal",
      "country", "country_name", "is_eu",
      "region", "region_code", "metro_code",
      "city", "postal", "latitude", "longitude",
      "time_zone", "asn", "asn_org", "continent", "colo", "user_agent",
    ];
    for (const k of expected) expect(body).toHaveProperty(k);
    expect(Object.keys(body).sort()).toEqual([...expected].sort());
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("/ negotiates HTML for browsers", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/", {
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 Chrome" },
    });
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("<!doctype html>");
  });

  it("/ returns plain text for curl", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/", {
      headers: { "User-Agent": "curl/8.4.0", "Accept": "*/*" },
    });
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("/ returns JSON when Accept asks for it", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/", {
      headers: { "Accept": "application/json" },
    });
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("/country and /country-iso return different shapes", async () => {
    const nameRes = await SELF.fetch("https://ip.coreymark.com/country");
    const isoRes = await SELF.fetch("https://ip.coreymark.com/country-iso");
    expect(nameRes.headers.get("content-type")).toContain("text/plain");
    expect(isoRes.headers.get("content-type")).toContain("text/plain");
  });

  it("/eu returns 'true' or 'false'", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/eu");
    const body = (await res.text()).trim();
    expect(["true", "false"]).toContain(body);
  });

  it("/ip/decimal returns plain text", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/ip/decimal");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("unknown path returns 404 plain text", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/nope");
    expect(res.status).toBe(404);
  });

  it("/headers returns inbound headers as JSON object", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/headers", {
      headers: { "X-Test-Marker": "alpha" },
    });
    const body = await res.json() as Record<string, string>;
    expect(body["x-test-marker"]).toBe("alpha");
  });
});

describe("ip.coreymark.com worker — HTML view", () => {
  // Documentation-range addresses only (RFC 5737 / RFC 3849).
  const V4 = "203.0.113.42";
  const V6 = "2001:db8:85a3:8d3:1319:8a2e:370:7348";
  const browser = (ip: string) => ({
    headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 Chrome", "CF-Connecting-IP": ip },
  });
  const page = async (ip = V4) => {
    const res = await SELF.fetch("https://ip.coreymark.com/", browser(ip));
    return { res, body: await res.text() };
  };
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");

  it("keeps its response headers: no-store, CORS, HTML content type", async () => {
    const { res } = await page();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("has the header, the IP panel, the usage panel and stays noindex", async () => {
    const { body } = await page();
    expect(body).toMatch(/<html lang="en">/);
    expect(body).toMatch(/<meta name="robots" content="noindex">/);
    for (const hook of ["data-ip-header", "data-brand", "data-ip-panel", "data-ip-fields", "data-ip-usage"]) {
      expect(body).toContain(hook);
    }
    expect(body.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("shows the caller's IP", async () => {
    const { body } = await page();
    const ip = body.match(/<p class="ip" data-ip>([\s\S]*?)<\/p>/);
    expect(ip).not.toBeNull();
    expect(stripTags(ip![1])).toBe(V4);
  });

  it("lets an IPv6 address wrap only after a colon, without changing its text", async () => {
    const { body } = await page(V6);
    const ip = body.match(/<p class="ip" data-ip>([\s\S]*?)<\/p>/)![1];
    expect(stripTags(ip)).toBe(V6);
    expect(ip.match(/<wbr>/g)).toHaveLength(7);
    expect(ip).not.toMatch(/[0-9a-f]<wbr>/);
  });

  it("has one row per field, in a fixed order", async () => {
    const { body } = await page();
    const fields = [...body.matchAll(/class="row" data-field="([a-z_]+)"/g)].map((m) => m[1]);
    expect(fields).toEqual([
      "ip_decimal", "country_name", "country", "is_eu",
      "region", "region_code", "metro_code", "city", "postal",
      "coordinates", "time_zone", "asn", "colo", "user_agent",
    ]);
  });

  it("links back to the tool on coreymark.com", async () => {
    const { body } = await page();
    const links = body.match(/<a href="https:\/\/coreymark\.com\/lab\/whatsmyip\/"[^>]*data-site-link/g);
    expect(links?.length).toBeGreaterThanOrEqual(1);
  });

  it("is self-contained: no script, and nothing loaded from another host", async () => {
    const { body } = await page();
    expect(body).not.toMatch(/<script/i);
    expect(body).not.toMatch(/<(link|img|iframe|source|video|audio|object|embed)\b/i);
    expect(body).not.toMatch(/@import|url\(|\bsrc=/i);
    expect(body).not.toMatch(/\son[a-z]+=/i);
  });

  it("turns motion off for prefers-reduced-motion", async () => {
    const { body } = await page();
    const block = body.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/animation: none/);
    expect(block![0]).toMatch(/transition: none/);
  });

  it("escapes the User-Agent", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/", {
      headers: { "Accept": "text/html", "User-Agent": 'Mozilla/5.0 <script>alert("x")</script>', "CF-Connecting-IP": V4 },
    });
    const body = await res.text();
    expect(body).not.toMatch(/<script/i);
    expect(body).toContain("&lt;script&gt;");
  });
});

describe("ip.coreymark.com worker — CORS", () => {
  it("JSON response carries Access-Control-Allow-Origin: *", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("plain-text response carries Access-Control-Allow-Origin: *", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/ip");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("HTML response carries Access-Control-Allow-Origin: *", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/", {
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("OPTIONS preflight returns 204 with CORS headers", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/json", {
      method: "OPTIONS",
      headers: {
        "Origin": "https://coreymark.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("404 response still carries CORS header", async () => {
    const res = await SELF.fetch("https://ip.coreymark.com/definitely-not-a-route");
    expect(res.status).toBe(404);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("ipToDecimal", () => {
  it("converts canonical IPv4", () => {
    expect(ipToDecimal("0.0.0.0")).toBe("0");
    expect(ipToDecimal("1.2.3.4")).toBe("16909060");
    expect(ipToDecimal("192.168.1.1")).toBe("3232235777");
    expect(ipToDecimal("255.255.255.255")).toBe("4294967295");
  });

  it("rejects invalid IPv4", () => {
    expect(ipToDecimal("1.2.3")).toBe("");
    expect(ipToDecimal("1.2.3.4.5")).toBe("");
    expect(ipToDecimal("256.0.0.0")).toBe("");
    expect(ipToDecimal("a.b.c.d")).toBe("");
  });

  it("converts canonical IPv6", () => {
    expect(ipToDecimal("::")).toBe("0");
    expect(ipToDecimal("::1")).toBe("1");
    expect(ipToDecimal("2601:801:501:5d00:50f0:3e1f:82a4:e467"))
      .toBe("50516018476739402886442404630841582695");
  });

  it("handles :: compression in different positions", () => {
    expect(ipToDecimal("2001::1")).toBe(
      ipToDecimal("2001:0:0:0:0:0:0:1"),
    );
    expect(ipToDecimal("::ffff:1")).toBe(
      ipToDecimal("0:0:0:0:0:0:ffff:1"),
    );
  });

  it("rejects malformed IPv6", () => {
    expect(ipToDecimal("zzzz::1")).toBe("");
    expect(ipToDecimal("1:2:3:4:5:6:7:8:9")).toBe("");
  });

  it("returns empty for empty / non-IP input", () => {
    expect(ipToDecimal("")).toBe("");
    expect(ipToDecimal("not-an-ip")).toBe("");
  });
});

describe("EU_COUNTRY_CODES", () => {
  it("contains 27 member states", () => {
    expect(EU_COUNTRY_CODES.size).toBe(27);
  });

  it("includes representative members", () => {
    for (const c of ["DE", "FR", "IT", "IE", "PL"]) {
      expect(EU_COUNTRY_CODES.has(c)).toBe(true);
    }
  });

  it("excludes non-members", () => {
    for (const c of ["US", "GB", "CH", "NO", "CA"]) {
      expect(EU_COUNTRY_CODES.has(c)).toBe(false);
    }
  });
});
