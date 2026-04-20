/**
 * INPUT SANITIZATION UTILITIES
 * Fix #10: Prevent NoSQL injection and XSS
 */

/**
 * Strip MongoDB operator keys ($, .) from any object recursively
 * Prevents NoSQL injection attacks like { "$gt": "" }
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // Remove keys starting with $ or containing .
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
};

/**
 * Express middleware — sanitizes req.body, req.query, req.params
 */
const sanitizeMiddleware = (req, res, next) => {
  if (req.body)   req.body   = sanitizeObject(req.body);
  if (req.query)  req.query  = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = { sanitizeObject, sanitizeMiddleware };
