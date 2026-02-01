import Redis from "ioredis";

declare global {
  var redisClient: Redis | undefined;
}

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  if (process.env.NODE_ENV === "production") {
    redis = new Redis(process.env.REDIS_URL);
  } else {
    // In development, persist the connection across reloads
    if (!global.redisClient) {
      global.redisClient = new Redis(process.env.REDIS_URL);
    }
    redis = global.redisClient;
  }
  
  if (redis) {
    redis.on("error", (error) => {
      console.error("Redis connection error:", error);
    });
    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }
}

export { redis };
