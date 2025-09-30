import { createDirectiveTransformer } from 'directive-to-hof';

export const useCacheDirectiveTransformer = createDirectiveTransformer({
  directive: 'use cache',
  importName: 'useCache',
  asyncOnly: true,
  importPath: './src/use-cache.ts',
});
