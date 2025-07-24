// File: ecosystem.config.js
module.exports = {
    apps: [
      {
        name: "nightxhub",
        script: "pnpm",
        args: "start",
        env: {
          PORT: 4950,
          NODE_ENV: "production"
        }
      }
    ]
  };
  