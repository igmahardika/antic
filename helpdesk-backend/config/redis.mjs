/**
 * Redis Configuration for AN-TIC Analytics Dashboard
 * 
 * This module handles Redis connection, caching utilities, and session management
 */

import Redis from 'ioredis';
import 'dotenv/config';

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };

      // Add Redis URL support for cloud deployments
      if (process.env.REDIS_URL) {
        this.client = new Redis(process.env.REDIS_URL);
      } else {
        this.client = new Redis(redisConfig);
      }

      // Event handlers
      this.client.on('connect', () => {
        console.log('🔗 Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connected and ready');
        this.isConnected = true;
        this.retryCount = 0;
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
        
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`🔄 Retrying Redis connection (${this.retryCount}/${this.maxRetries})...`);
        }
      });

      this.client.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Test connection
      await this.client.connect();
      await this.client.ping();
      
      return this.client;
    } catch (error) {
      console.error('💥 Redis initialization failed:', error.message);
      
      // Fallback to memory-based caching if Redis fails
      console.log('⚠️  Falling back to memory-based caching');
      this.client = new MemoryCache();
      
      return this.client;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * Gracefully disconnect Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      console.log('✅ Redis disconnected gracefully');
    }
  }

  /**
   * Cache utilities
   */
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        return await this.client.setex(key, ttl, serializedValue);
      }
      return await this.client.set(key, serializedValue);
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error('Redis EXPIRE error:', error.message);
      return false;
    }
  }

  async incr(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error.message);
      return 0;
    }
  }

  async hset(key, field, value) {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.client.hset(key, field, serializedValue);
    } catch (error) {
      console.error('Redis HSET error:', error.message);
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis HGET error:', error.message);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const hash = await this.client.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      console.error('Redis HGETALL error:', error.message);
      return {};
    }
  }

  /**
   * Session utilities
   */
  async setSession(sessionId, sessionData, ttl = 86400) { // 24 hours default
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  async refreshSession(sessionId, ttl = 86400) {
    const key = `session:${sessionId}`;
    return await this.expire(key, ttl);
  }

  /**
   * User activity tracking
   */
  async trackUserActivity(userId, activity) {
    const key = `user:${userId}:activity`;
    const timestamp = Date.now();
    const activityData = {
      ...activity,
      timestamp
    };
    
    // Store in a sorted set for time-based queries
    return await this.client.zadd(key, timestamp, JSON.stringify(activityData));
  }

  async getUserActivity(userId, limit = 50) {
    const key = `user:${userId}:activity`;
    try {
      const activities = await this.client.zrevrange(key, 0, limit - 1);
      return activities.map(activity => JSON.parse(activity));
    } catch (error) {
      console.error('Redis getUserActivity error:', error.message);
      return [];
    }
  }

  /**
   * Rate limiting utilities
   */
  async rateLimit(key, limit, window) {
    const current = await this.incr(key);
    if (current === 1) {
      await this.expire(key, window);
    }
    return {
      current,
      remaining: Math.max(0, limit - current),
      resetTime: window
    };
  }
}

/**
 * Fallback memory cache when Redis is unavailable
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    console.log('⚠️  Using memory cache fallback');
  }

  async set(key, value, ttl) {
    this.cache.set(key, JSON.stringify(value));
    
    if (ttl) {
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      
      this.timers.set(key, timer);
    }
    
    return 'OK';
  }

  async get(key) {
    const value = this.cache.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key) ? 1 : 0;
  }

  async exists(key) {
    return this.cache.has(key) ? 1 : 0;
  }

  async expire(key, ttl) {
    if (!this.cache.has(key)) return 0;
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
    return 1;
  }

  async incr(key) {
    const current = parseInt(this.cache.get(key) || '0') + 1;
    this.cache.set(key, current.toString());
    return current;
  }

  // Simplified implementations for other methods
  async setex(key, ttl, value) { return this.set(key, value, ttl); }
  async hset(key, field, value) { return this.set(`${key}:${field}`, value); }
  async hget(key, field) { return this.get(`${key}:${field}`); }
  async hgetall(key) { return {}; }
  async zadd() { return 1; }
  async zrevrange() { return []; }
  async ping() { return 'PONG'; }
  async connect() { return this; }
  async quit() { return 'OK'; }
  get status() { return 'ready'; }
}

// Create singleton instance
const redisManager = new RedisManager();

export default redisManager;
export { RedisManager, MemoryCache };