export default {
  apps: [{
    name: 'nothing-api',
    script: './packages/api/dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://nothing:password@127.0.0.1:5432/nothing',
      STALWART_API: 'http://127.0.0.1:8443',
      STALWART_ADMIN_TOKEN: '',
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
      JWT_SECRET: '',
    },
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
