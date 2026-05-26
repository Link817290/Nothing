import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  splitting: false,
  external: [
    '@inquirer/prompts',
    '@modelcontextprotocol/sdk',
  ],
})
