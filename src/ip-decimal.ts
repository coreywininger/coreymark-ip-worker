export function ipToDecimal(ip: string): string {
  if (!ip) return "";
  if (ip.includes(".") && !ip.includes(":")) return ipv4ToDecimal(ip);
  if (ip.includes(":")) return ipv6ToDecimal(ip);
  return "";
}

function ipv4ToDecimal(ip: string): string {
  const parts = ip.split(".");
  if (parts.length !== 4) return "";
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return "";
    n = n * 256 + v;
  }
  return String(n);
}

function ipv6ToDecimal(ip: string): string {
  const [head, tail] = ip.includes("::") ? ip.split("::", 2) : [ip, ""];
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  if (missing < 0) return "";
  const parts = [
    ...headParts,
    ...Array(missing).fill("0"),
    ...tailParts,
  ];
  if (parts.length !== 8) return "";
  let n = 0n;
  for (const p of parts) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return "";
    n = (n << 16n) + BigInt(parseInt(p, 16));
  }
  return n.toString();
}
