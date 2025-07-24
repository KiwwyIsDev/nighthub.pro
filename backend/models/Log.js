// File: models/Log.js
module.exports = {
    create: async (data) => {
      console.log(`[LOG - ${data.status?.toUpperCase() || "UNKNOWN"}]`, {
        token: data.token,
        action: data.action,
        ip: data.ip,
        status: data.status,
        details: data.details,
        origin: data.origin,
        userAgent: data.userAgent,
        timestamp: new Date().toISOString(),
      });
    },
  };
