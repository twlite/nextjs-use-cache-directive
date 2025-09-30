import { createDirectiveTransformer } from 'directive-to-hof';

// this is a transformer that transforms the `'use cache'` directive into a function call to the `useCache` function
export const useCacheDirectiveTransformer = createDirectiveTransformer({
  directive: 'use cache',
  importName: 'useCache',
  asyncOnly: true,
  importPath: './src/use-cache.ts',
});
