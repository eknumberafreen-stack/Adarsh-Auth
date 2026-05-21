const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    // Debug: log the raw env vars so we can confirm what Railway is injecting
    console.log('[Redis] REDIS_URL      :', process.env.REDIS_URL      || '(not set)');
    console.log('[Redis] REDISHOST      :', process.env.REDISHOST      || '(not set)');
    console.log('[Redis] REDISPORT      :', process.env.REDISPORT      || '(not set)');
    console.log('[Redis] REDIS_HOST     :', process.env.REDIS_HOST     || '(not set)');
    console.log('[Redis] REDIS_PORT     :', process.env.REDIS_PORT     || '(not set)');

    let clientConfig;

    if (process.env.REDIS_URL) {
      // Preferred: full connection URL (Railway sets this automatically)
      console.log('[Redis] Using REDIS_URL for connection');
      clientConfig = { url: process.env.REDIS_URL };
    } else {
      // Fallback: individual variables — Railway exposes both REDISHOST and
      // REDIS_HOST variants depending on the plugin version, so check both.
      const host     = process.env.REDISHOST     || process.env.REDIS_HOST     || 'localhost';
      const port     = process.env.REDISPORT     || process.env.REDIS_PORT     || 6379;
      const password = process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || undefined;

      console.log(`[Redis] REDIS_URL not set — falling back to ${host}:${port}`);

      clientConfig = {
        socket: {
          host,
          port: parseInt(port, 10)
        },
        ...(password && { password })
      };
    }

    redisClient = redis.createClient(clientConfig);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Connected');
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    process.exit(1);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

module.exports = connectRedis;
module.exports.getRedisClient = getRedisClient;
