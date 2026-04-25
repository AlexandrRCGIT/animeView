import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

declare global {
  var _redis: Redis | undefined;
}

function createRedis(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  client.on('error', (err) => {
    console.error('[redis] connection error:', err.message);
  });
  return client;
}

// Reuse connection across hot-reloads in dev
const redis: Redis = globalThis._redis ?? createRedis();
if (process.env.NODE_ENV !== 'production') globalThis._redis = redis;

export default redis;
