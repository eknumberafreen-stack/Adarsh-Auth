const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    // Railway provides REDIS_URL — use it if available
    const clientConfig = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : {
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379
          },
          password: process.env.REDIS_PASSWORD || undefined
        };

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
