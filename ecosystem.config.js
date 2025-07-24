// File: ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "nightx-hub-frontend",
      script: "pnpm",
      args: "start",
      cwd: "./frontend",
      env: {
        PORT: 4950,
        NODE_ENV: "production"
      }
    },
    {
      name: "nightx-hub-backend",
      script: "node",
      args: "server.js",
      cwd: "./backend",
      env: {
        PORT: 4547,
        NODE_ENV: "production"
      }
    }
  ]
};