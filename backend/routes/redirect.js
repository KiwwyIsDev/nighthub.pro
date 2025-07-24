// File: routes/redirect.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const Hash = require("../models/Hash");
const User = require("../models/User");
const Log = require("../models/Log");

function isValidUUID(token) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
}

// ส่วน Linkvertise
router.get("/linkvertise", async (req, res) => {
    const { hash } = req.query;
    const token = req.cookies.token;

    if (!hash || !token || !isValidUUID(token)) {
        return res.redirect("https://nighthub.pro/key?error=missing");
    }

    try {
        const result = await axios.post("https://publisher.linkvertise.com/api/v1/anti_bypassing", null, {
            params: {
                token: process.env.LINKVERTISE_API_TOKEN,
                hash,
            },
        });

        if (result.data.status === true) {
            const user = await User.findOne({ token });
            if (user && user.progress >= 1) {
                return res.redirect("https://nighthub.pro/key?error=progress_full");
            }

            await User.updateOne(
                { token },
                {
                    $inc: { progress: 1 },
                    $set: {
                        latestSourceVerified: "linkvertise",
                        lastSourceTimestamp: new Date()
                    }
                },
                { upsert: true }
            );

            await Log.create({
                token,
                action: "verify_linkvertise",
                status: "success",
                details: { hash },
                ip: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.redirect("https://nighthub.pro/key");
        }

        return res.redirect("https://nighthub.pro/key?error=invalid");
    } catch (err) {
        console.error("[LINKVERTISE] error:", err.message);
        return res.redirect("https://nighthub.pro/key?error=server");
    }
});



router.get("/lootlab", async (req, res) => {
    const { hash } = req.query;
    if (!hash) return res.redirect("https://nighthub.pro/key?error=missing");

    const exists = await Hash.findOne({ hash });
    if (!exists) return res.redirect("https://nighthub.pro/key?error=invalid");

    const user = await User.findOne({ token: exists.token });
    if (user && user.progress >= 1) {
        return res.redirect("https://nighthub.pro/key?error=progress_full");
    }

    await User.updateOne(
        { token: exists.token },
        {
            $inc: { progress: 1 },
            $set: {
                latestSourceVerified: "lootlab",
                lastSourceTimestamp: new Date()
            }
        },
        { upsert: true }
    );

    await Hash.deleteOne({ hash });
    await Log.create({
        token: exists.token,
        action: "verify_lootlab",
        status: "success",
        details: { hash },
        ip: req.ip,
    });

    return res.redirect("https://nighthub.pro/key");
});


module.exports = router;
