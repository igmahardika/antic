// Reset rate limits and brute force protection
// This script clears any blocked IPs and rate limit counters

import { createPool } from 'mysql2/promise';
import redisManager from './helpdesk-backend/config/redis.mjs';

const db = createPool({
  host: 'localhost',
  user: 'hmrnexa',
  password: '7ynkgnqiiF6phLSRNHli',
  database: 'helpdesk',
  port: 3306,
});

async function resetRateLimits() {
  try {
    console.log('🔧 Resetting rate limits and brute force protection...');
    
    // Connect to Redis
    await redisManager.connect();
    
    // Clear all rate limit keys (this will reset all rate limiting)
    const keys = await redisManager.redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await redisManager.redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} rate limit keys`);
    }
    
    // Clear all brute force protection keys
    const bfKeys = await redisManager.redis.keys('brute_force:*');
    if (bfKeys.length > 0) {
      await redisManager.redis.del(...bfKeys);
      console.log(`✅ Cleared ${keys.length} brute force keys`);
    }
    
    // Clear all session keys (optional - this will log out all users)
    const sessionKeys = await redisManager.redis.keys('session:*');
    if (sessionKeys.length > 0) {
      await redisManager.redis.del(...sessionKeys);
      console.log(`✅ Cleared ${sessionKeys.length} session keys`);
    }
    
    console.log('🎉 Rate limits and brute force protection reset successfully!');
    console.log('📝 You can now try logging in with:');
    console.log('   Username: admin');
    console.log('   Password: Kin6ArthUr');
    
  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
  } finally {
    await db.end();
    await redisManager.disconnect();
  }
}

resetRateLimits();
