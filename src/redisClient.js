const Redis = require("ioredis");

// Initialize Redis Client with fallback and timeout configurations
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000
});

redis.on('error', (err) => {
  console.warn('[Redis Warning] Connection failed:', err.message);
});

module.exports = redis;
