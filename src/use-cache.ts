import { AsyncLocalStorage } from 'node:async_hooks';

// this is the cache context interface
// it contains the cache tags and the cache life
interface CacheContextData {
  tags: Set<string>;
  life: number | null;
}

// this is the AsyncLocalStorage instance that we use to track the cache context
// for each function call to the `useCache` function
const cacheContextWorker = new AsyncLocalStorage<CacheContextData>();

// this is the cache entry interface
// it contains the cached data, the cache life, the cache tags, and the creation timestamp
interface CacheEntry {
  data: any;
  life: number | null;
  tags: Set<string>;
  createdAt: number;
}

// this is the in-memory cache where we store the cached data
const cache = new Map<string, CacheEntry>();

// this is a simple helper function to generate a cache key from the arguments
// we use JSON.stringify to generate a unique key for the arguments
// but this is not the best way to generate a cache key
// you could look into libs like stable-hash to generate a more stable key
function makeCacheKey(...args: any[]) {
  return JSON.stringify(args);
}

// this is a wrapper function that `'use cache'` directive compiles to
// yes, it is a higher-order function in disguise :D
export function useCache<F extends () => Promise<any>>(fn: F): F {
  // return a wrapper function to intercept the arguments and call the original function
  const memo = ((...args) => {
    // generate a cache key from the arguments
    const cacheKey = makeCacheKey(...args);

    // run the rest of the code in cache context
    return cacheContextWorker.run(
      {
        life: null,
        tags: new Set(),
      },
      async () => {
        // fetch the current cache context
        const ctx = cacheContextWorker.getStore();

        // helper function to call the original function and cache the result
        const uncached = async (entry?: CacheEntry) => {
          // we are simply calling the original function here
          const result = await fn(...args);

          // we dont want to deal with caching if the result is undefined
          if (result === undefined) return result;

          // set the cache entry
          cache.set(cacheKey, {
            ...entry,
            data: result,
            life: ctx?.life ?? entry?.life ?? null,
            tags: ctx?.tags ?? entry?.tags ?? new Set(),
            createdAt: Date.now(),
          });

          // return the result
          return result;
        };

        // this should never happen, but just in case xD
        if (!ctx) {
          return uncached();
        }

        // fetch the cache entry from the cache key
        const entry = cache.get(cacheKey);

        // if the cache entry exists, we do the further checks
        if (entry) {
          // we validate the cache entry's life and if it has expired
          // we call the original function and cache the result again
          if (entry.life && Date.now() - entry.createdAt > entry.life) {
            return uncached(entry);
          }

          // otherwise, we return the cached data
          // in this case, the original function does not run
          return entry.data;
        }

        // conditions are not met, so we call the original function and cache the result
        return uncached();
      }
    );
  }) as F;

  // we return the wrapper function
  return memo;
}

// this function is used to set the cache life
export function cacheLife(life: number) {
  // we fetch the current cache context to know the owner of this function call
  const ctx = cacheContextWorker.getStore();

  // if the context is not found, we throw an error
  if (!ctx) {
    throw new Error('cacheLife must be used inside "use cache" function');
  }

  // otherwise, we set the new cache life for the owner of this function call
  ctx.life = life;
}

// this function is used to set the cache tags
// which are used for revalidation
export function cacheTag(...tags: string[]) {
  // we fetch the current cache context to know the owner of this function call
  const ctx = cacheContextWorker.getStore();

  // if the context is not found, we throw an error
  if (!ctx) {
    throw new Error('cacheTag must be used inside "use cache" function');
  }

  // otherwise, we set the new cache tags for the owner of this function call
  tags.forEach((tag) => ctx.tags.add(tag));
}

// this function is used to revalidate a cache tag
// which deletes the cached data for the given tag
export function revalidateTag(tag: string) {
  // we iterate over the cache and delete the entries that have the given tag
  // next call to the function will fetch the new data
  for (const [key, entry] of cache.entries()) {
    if (entry.tags.has(tag)) {
      cache.delete(key);
    }
  }
}
