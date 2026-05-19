import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/api/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
})
