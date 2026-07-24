/**
 * Helper to extract the real client IP address.
 * Supports Cloudflare (including Pseudo IPv4), standard reverse proxies, and local addresses.
 */
const getClientIp = (req) => {
  // 1. Check Cloudflare Pseudo IPv4 header if enabled in Cloudflare Network settings
  const pseudoIpv4 = req.headers['cf-pseudo-ipv4'];
  if (pseudoIpv4 && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(pseudoIpv4.trim())) {
    return pseudoIpv4.trim();
  }

  // 2. Extract primary headers
  const cfIp = req.headers['cf-connecting-ip'] ? req.headers['cf-connecting-ip'].trim() : null;
  const xForwarded = req.headers['x-forwarded-for'];
  const rawIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';

  let primaryIp = cfIp || (xForwarded ? xForwarded.split(',')[0].trim() : null) || rawIp;

  // Clean IPv6-mapped IPv4 (e.g., "::ffff:192.168.1.1")
  if (primaryIp.startsWith('::ffff:')) {
    primaryIp = primaryIp.substring(7);
  }

  // If primary IP is IPv6, check if there's an IPv4 address in X-Forwarded-For proxy chain
  if (primaryIp.includes(':') && xForwarded) {
    const ips = xForwarded.split(',').map(s => s.trim());
    const ipv4Match = ips.find(ip => {
      const clean = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
      return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean);
    });
    if (ipv4Match) {
      return ipv4Match.startsWith('::ffff:') ? ipv4Match.substring(7) : ipv4Match;
    }
  }

  return primaryIp;
};

module.exports = { getClientIp };
