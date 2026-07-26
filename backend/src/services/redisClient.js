const redis = require("redis");

let client = null;
const fallbackBlacklist = new Map();

const initRedis = async () => {
  if (client && client.isOpen) {
    return client;
  }

  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log(
              "ℹ️ [Redis] Server unavailable. Using in-memory fallback store."
            );
            return false; // Stop reconnecting loop and use in-memory fallback cleanly
          }
          return 1000;
        },
      },
    });

    client.on("error", (err) => {
      console.error("[Redis] Error:", err.message);
    });

    client.on("connect", () => {
      console.log("[Redis] Connection established.");
    });

    client.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });

    await client.connect();
    return client;
  } catch (error) {
    console.warn(
      "[Redis] Redis unavailable, using in-memory fallback:",
      error?.message || error,
    );
    client = null;
    return null;
  }
};

const redisAvailable = () => Boolean(client && client.isOpen);

const cleanupFallback = () => {
  const now = Date.now();
  for (const [token, data] of fallbackBlacklist.entries()) {
    const expiresAt = typeof data === "object" ? data.expiresAt : data;
    if (expiresAt <= now) {
      fallbackBlacklist.delete(token);
    }
  }
};

const blacklistToken = async (token, expiresIn) => {
  try {
    if (expiresIn <= 0) return;

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
    return false;
  }
};

const storeRefreshToken = async (userId, refreshToken) => {
  try {
    if (redisAvailable()) {
      await client.setEx(`refresh:${userId}`, 1 * 60 * 60, refreshToken);
      return;
    }

    const expiresAt = Date.now() + 1 * 60 * 60 * 1000;
    fallbackBlacklist.set(`refresh:${userId}`, {
      token: refreshToken,
      expiresAt,
    });
  } catch (error) {
    console.error("Error storing refresh token:", error);
    throw error;
  }
};

const getRefreshToken = async (userId) => {
  try {
    if (redisAvailable()) {
      return await client.get(`refresh:${userId}`);
    }

    cleanupFallback();
    const data = fallbackBlacklist.get(`refresh:${userId}`);

    if (data && data.expiresAt > Date.now()) {
      return data.token;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
};

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
