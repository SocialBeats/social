/**
 * Simple in-memory cache with TTL support
 */

class Cache {
  constructor(ttlMs = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    this.store = new Map();
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from cache
   * @param {string} key
   * @returns {any|null} cached value or null if expired/not found
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs Optional: override default TTL
   */
  set(key, value, ttlMs = this.ttlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Batch get/set for multiple users
   * Returns missing keys that need to be fetched
   */
  getMissing(keys) {
    const missing = [];
    keys.forEach((key) => {
      if (!this.get(key)) {
        missing.push(key);
      }
    });
    return missing;
  }

  /**
   * Set multiple values at once
   */
  setMultiple(entries) {
    entries.forEach(([key, value]) => this.set(key, value));
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.store.size;
  }
}

// Create a singleton cache for users (5-minute TTL)
export const userCache = new Cache(5 * 60 * 1000);

export default Cache;
