/**
 * Helper to extract the real client IP address and guard against banning
 * shared reverse-proxy / Cloudflare / private infrastructure IPs.
 */

const ipv4ToInt = (ip) => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n < 0 || n > 255) return null;
    num = (num * 256) + n;
  }
  return num >>> 0;
};

const inIpv4Cidr = (ipInt, cidr) => {
  const [base, prefixStr] = cidr.split('/');
  const baseInt = ipv4ToInt(base);
  const prefix = parseInt(prefixStr, 10);
  if (baseInt === null || Number.isNaN(prefix)) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((baseInt & mask) >>> 0);
};

// Infrastructure / private / loopback / CGNAT / official Cloudflare IPv4 ranges
// Note: Class E (240.0.0.0/4) is intentionally excluded because Cloudflare CF-Pseudo-IPv4 uses it per-client.
const PROTECTED_IPV4_CIDRS = [
  // Local / private / CGNAT / link-local
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  // Official Cloudflare IPv4 proxy ranges
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

const PROTECTED_IPV6_PREFIXES = [
  '::1',
  'fe80:',
  'fc',
  'fd',
  // Official Cloudflare IPv6 proxy ranges
  '2400:cb00:',
  '2606:4700:',
  '2803:f800:',
  '2405:b500:',
  '2405:8100:',
  '2a06:98c0:',
  '2a06:98c1:',
  '2c0f:f248:',
];

const normalizeIp = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let ip = raw.trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
};

const isProtectedProxyOrPrivateIp = (rawIp) => {
  const ip = normalizeIp(rawIp);
  if (!ip) return true;

  const ipInt = ipv4ToInt(ip);
  if (ipInt !== null) {
    return PROTECTED_IPV4_CIDRS.some((cidr) => inIpv4Cidr(ipInt, cidr));
  }

  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  return PROTECTED_IPV6_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

const getClientIp = (req) => {
  const headers = req.headers || {};

  // 1. Cloudflare Pseudo IPv4 (unique per IPv6 client when enabled in Cloudflare Network settings)
  const rawPseudo = Array.isArray(headers['cf-pseudo-ipv4'])
    ? headers['cf-pseudo-ipv4'][0]
    : headers['cf-pseudo-ipv4'];
  const pseudoIpv4 = normalizeIp(rawPseudo);
  if (pseudoIpv4 && ipv4ToInt(pseudoIpv4) !== null) {
    return pseudoIpv4;
  }

  // 2. Cloudflare verified true client IP (IPv4 or IPv6)
  const rawCfIp = Array.isArray(headers['cf-connecting-ip'])
    ? headers['cf-connecting-ip'][0]
    : headers['cf-connecting-ip'];
  const cfIp = normalizeIp(rawCfIp);
  if (cfIp) {
    return cfIp;
  }

  // 3. First hop ONLY from X-Forwarded-For (never scan later entries, which are reverse proxies!)
  const rawXff = Array.isArray(headers['x-forwarded-for'])
    ? headers['x-forwarded-for'][0]
    : headers['x-forwarded-for'];
  if (rawXff && typeof rawXff === 'string') {
    const firstHop = normalizeIp(rawXff.split(',')[0]);
    if (firstHop) {
      return firstHop;
    }
  }

  // 4. Direct socket / Express req.ip fallback
  const fallback = normalizeIp(
    req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1'
  );
  return fallback || '127.0.0.1';
};

module.exports = {
  getClientIp,
  normalizeIp,
  isProtectedProxyOrPrivateIp,
};
