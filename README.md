# Next.js `'use cache'` directive re-implementation

This is a re-implementation of the [`'use cache'`](https://nextjs.org/docs/app/api-reference/directives/use-cache) directive from Next.js. It is not as feature-complete as the original, but it is a good way to learn about the internals of Next.js.

## What this does

1. Takes the input as such:

```ts
async function fetchUserData(userId: string) {
  'use cache'; // special directive to turn this function into a cached function

  // sets cache lifetime to 10 seconds
  cacheLife(10_000);
  // sets cache tag to `user:${userId}` to be used for revalidation
  cacheTag(`user:${userId}`);

  // fetches user data from the database
  const userData = await db.users.findUnique({
    where: { id: userId },
  });

  // the returned data is automatically cached
  return userData;
}

// for revalidation, you can call:
revalidateTag(`user:${userId}`);
```

2. Whenever the `fetchUserData` function is called, if it has not been cached yet, it will be cached. Otherwise it will return cached data if its cache life has not expired.

This example uses [directive-to-hof](https://npm.im/directive-to-hof) to transform the `'use cache'` directive into a function call. Additionally, it uses [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) to maintain the cache context for each function call.
