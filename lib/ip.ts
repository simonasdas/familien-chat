export function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "direkt";
}

export function getNeighborKey(request: Request): string {
  const ip = getClientIp(request);
  if (ip.includes(":") && !ip.includes(".")) {
    const prefix = ip.split("%")[0].split(":").slice(0, 4).join(":");
    return `ipv6:${prefix}`;
  }
  return ip;
}
