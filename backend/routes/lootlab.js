const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const Hash = require("../models/Hash");

function isValidUUID(token) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
  }
  
router.post("/encrypt", async (req, res) => {
    const token = req.cookies.token;
    if (!token || !isValidUUID(token)) {
      return res.status(400).json({ error: "Invalid or missing token" });
    }
  
    const hash = crypto.randomBytes(32).toString("hex");
  
    await Hash.create({ token, hash });
  
    const apiRes = await axios.get("https://be.lootlabs.gg/api/lootlabs/url_encryptor", {
      params: {
        destination_url: `https://api.nighthub.pro/lootlab?hash=${hash}`,
        api_token: process.env.LOOTLAB_API_TOKEN,
      },
    });
  
    return res.json({ encrypted: apiRes.data.message });
  });
  
module.exports = router;
