/**
 * Helper to extract the real client IP address.
 * Supports Cloudflare, standard reverse proxies, and local addresses.
 */
const getClientIp = (req) => {
  const ip = req.headers['cf-connecting-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0].trim() || 
             req.ip || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             '127.0.0.1';
             
  // Remove IPv6 prefix if present (e.g., "::ffff:")
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

module.exports = { getClientIp };
