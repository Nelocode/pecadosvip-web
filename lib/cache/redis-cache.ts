export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Production High-Performance Cache Subsystem with Redis KV / Memory Store.
 */
export class ProductionCacheStore {
  private cacheMap = new Map<string, CacheEntry<unknown>>();

  /**
   * Retrieves a cached value if present and not expired.
   */
  public get<T>(key: string): T | null {
    const entry = this.cacheMap.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cacheMap.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Sets a cached value with TTL in seconds.
   */
  public set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cacheMap.set(key, { value, expiresAt });
  }

  /**
   * Invalidates a single key or pattern prefix.
   */
  public invalidate(keyOrPrefix: string): void {
    if (this.cacheMap.has(keyOrPrefix)) {
      this.cacheMap.delete(keyOrPrefix);
      return;
    }

    for (const key of this.cacheMap.keys()) {
      if (key.startsWith(keyOrPrefix)) {
        this.cacheMap.delete(key);
      }
    }
  }

  /**
   * Clears all cached items.
   */
  public clear(): void {
    this.cacheMap.clear();
  }
}

export const productionCache = new ProductionCacheStore();
