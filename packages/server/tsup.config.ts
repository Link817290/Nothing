import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  splitting: false,
  external: [
    'pg',
    'nodemailer',
    'imapflow',
    'mailparser',
    'fastify',
    '@fastify/cors',
    '@fastify/jwt',
    'bcryptjs',
  ],
})
