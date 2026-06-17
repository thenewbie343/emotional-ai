const Redis = require("ioredis");

let redisClient = null;

const hasRedisConfig = !!process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Mock Redis client for graceful fallback when Redis is not configured in production
class MockRedis {
  constructor() {
    this.isMock = true;
    console.log('[Redis] Shared Redis instance is running in MOCK mode (Fail-Open).');
  }

  async ping() {
    return 'PONG (Mock)';
  }

  async incr(key) {
    return 1;
  }

  async expire(key, seconds) {
    return 1;
  }

  async ttl(key) {
    return -1;
  }

  pipeline() {
    return {
      incr: () => {},
      ttl: () => {},
      exec: async () => {
        // Returns [error, result] for each operation in pipeline
        // Simulates first increment (count = 1, ttl = -1) to pass rate limiting checks
        return [
          [null, 1],
          [null, -1]
        ];
      }
    };
  }

  on(event, handler) {
    // No-op to support event handlers like redis.on('error', ...)
    return this;
  }
}

if (hasRedisConfig || !isProduction) {
  // Initialize real Redis connection
  redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000
  });

  redisClient.on('error', (err) => {
    console.warn('[Redis Warning] Connection failed, rate limits will fail open:', err.message);
  });
} else {
  // Gracefully fallback to Mock client
  redisClient = new MockRedis();
}

module.exports = redisClient;
