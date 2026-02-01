// Simple in-memory rate limiter for API routes
// For production, use Redis or a proper rate limiting service
import { redis } from "./redis.server";

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 10;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const checkRateLimit = async (identifier: string): Promise<{ 
  allowed: boolean; 
  remaining: number;
  resetTime: number;
}> => {
  // Use Redis if available
  if (redis) {
    const key = `ratelimit:${identifier}`;
    try {
      const currentCount = await redis.incr(key);
      
      // If new entry, set expiration
      if (currentCount === 1) {
        await redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
      }
      
      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (Math.max(0, ttl) * 1000);
      
      if (currentCount > RATE_LIMIT_MAX) {
         return {
           allowed: false,
           remaining: 0,
           resetTime
         };
      }
      
      return {
        allowed: true,
        remaining: Math.max(0, RATE_LIMIT_MAX - currentCount),
        resetTime
      };
    } catch (error) {
       console.error("Redis rate limit error, falling back to memory:", error);
    }
  }

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window or expired window
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { 
      allowed: true, 
      remaining: RATE_LIMIT_MAX - 1,
      resetTime 
    };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { 
      allowed: false, 
      remaining: 0,
      resetTime: entry.resetTime 
    };
  }

  // Increment count
  entry.count += 1;
  rateLimitStore.set(identifier, entry);

  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX - entry.count,
    resetTime: entry.resetTime 
  };
};

// Helper to get client IP from request
export const getClientIdentifier = (request: Request): string => {
  // Try to get real IP from common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier if no IP available
  return "unknown";
};
