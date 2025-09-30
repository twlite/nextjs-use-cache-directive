import { AsyncLocalStorage } from 'node:async_hooks';

interface CacheContextData {
  tags: Set<string>;
  life: number | null;
}

const cacheContextWorker = new AsyncLocalStorage<CacheContextData>();

interface CacheEntry {
  data: any;
  life: number | null;
  tags: Set<string>;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

function makeCacheKey(...args: any[]) {
  return JSON.stringify(args);
}

export function useCache<F extends () => Promise<any>>(fn: F): F {
  const memo = ((...args) => {
    const cacheKey = makeCacheKey(...args);

    return cacheContextWorker.run(
      {
        life: null,
        tags: new Set(),
      },
      async () => {
        const ctx = cacheContextWorker.getStore();

        const uncached = async (entry?: CacheEntry) => {
          const result = await fn(...args);

          if (result === undefined) return result;

          cache.set(cacheKey, {
            ...entry,
            data: result,
            life: ctx?.life ?? entry?.life ?? null,
            tags: ctx?.tags ?? entry?.tags ?? new Set(),
            createdAt: Date.now(),
          });

          return result;
        };

        if (!ctx) {
          return uncached();
        }

        const entry = cache.get(cacheKey);

        if (entry) {
          if (entry.life && Date.now() - entry.createdAt > entry.life) {
            return uncached(entry);
          }

          return entry.data;
        }

        return uncached();
      }
    );
  }) as F;

  return memo;
}

export function cacheLife(life: number) {
  const ctx = cacheContextWorker.getStore();

  if (!ctx) {
    throw new Error('cacheLife must be used inside "use cache" function');
  }

  ctx.life = life;
}

export function cacheTag(...tags: string[]) {
  const ctx = cacheContextWorker.getStore();

  if (!ctx) {
    throw new Error('cacheTag must be used inside "use cache" function');
  }

  tags.forEach((tag) => ctx.tags.add(tag));
}

export function revalidateTag(tag: string) {
  for (const [key, entry] of cache.entries()) {
    if (entry.tags.has(tag)) {
      cache.delete(key);
    }
  }
}
