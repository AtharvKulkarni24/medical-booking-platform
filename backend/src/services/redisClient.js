const redis = require("redis");

let client = null;
const fallbackBlacklist = new Map();

const initRedis = async () => {
  try {
    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on("error", (err) => console.log("Redis Client Error", err));
    client.on("connect", () => console.log("Redis Client Connected"));

    await client.connect();
    return client;
  } catch (error) {
    console.warn(
      "Redis unavailable, falling back to in-memory blacklist:",
      error?.message || error,
    );
    client = null;
    return null;
  }
};

const redisAvailable = () => client && client.isOpen;

const cleanupFallback = () => {
  const now = Date.now();
  for (const [token, expiresAt] of fallbackBlacklist.entries()) {
    if (expiresAt <= now) {
      fallbackBlacklist.delete(token);
    }
  }
};

// Blacklist a token (add it to Redis or in-memory fallback)
const blacklistToken = async (token, expiresIn) => {
  try {
    if (expiresIn <= 0) {
      // Token already expired or no TTL — nothing to store
      return;
    }

    if (redisAvailable()) {
      await client.setEx(`blacklist:${token}`, expiresIn, "true");
      return;
    }

    const expiresAt = Date.now() + expiresIn * 1000;
    fallbackBlacklist.set(token, expiresAt);
  } catch (error) {
    console.error("Error blacklisting token:", error);
    throw error;
  }
};

// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
  try {
    if (redisAvailable()) {
      const result = await client.get(`blacklist:${token}`);
      return result !== null;
    }

    cleanupFallback();
    return fallbackBlacklist.has(token);
  } catch (error) {
    console.error("Error checking token blacklist:", error);
    return false; // On error, allow the request (fail open)
  }
};

// Store refresh token for a user
const storeRefreshToken = async (userId, refreshToken) => {
  try {
    if (redisAvailable()) {
      // Store with 7 day TTL
      await client.setEx(`refresh:${userId}`, 7 * 24 * 60 * 60, refreshToken);
      return;
    }

    // Fallback: store in-memory with expiry
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    fallbackBlacklist.set(`refresh:${userId}`, expiresAt);
  } catch (error) {
    console.error("Error storing refresh token:", error);
    throw error;
  }
};

// Retrieve refresh token for a user
const getRefreshToken = async (userId) => {
  try {
    if (redisAvailable()) {
      return await client.get(`refresh:${userId}`);
    }

    cleanupFallback();
    const expiresAt = fallbackBlacklist.get(`refresh:${userId}`);
    if (expiresAt && expiresAt > Date.now()) {
      // In a real scenario, we'd store the token in the map value
      return fallbackBlacklist.get(`refresh:${userId}`);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
};

// Revoke all refresh tokens for a user (logout)
const revokeRefreshToken = async (userId) => {
  try {
    if (redisAvailable()) {
      await client.del(`refresh:${userId}`);
      return;
    }

    fallbackBlacklist.delete(`refresh:${userId}`);
  } catch (error) {
    console.error("Error revoking refresh token:", error);
    throw error;
  }
};

module.exports = {
  initRedis,
  blacklistToken,
  isTokenBlacklisted,
  storeRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
};
