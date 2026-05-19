import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server-process.ts',
  ],
  format: ['esm'],
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [],
  external: [
    'sql.js',
    'nodemailer',
    'imapflow',
    'fastify',
    '@inquirer/prompts',
    '@modelcontextprotocol/sdk',
    '@fastify/static',
    'mailparser',
  ],
})
