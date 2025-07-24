const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Key = require("../models/Key");

function isValidUUID(token) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
}

router.get("/info", async (req, res) => {
    const token = req.cookies.token;
    if (!token || !isValidUUID(token)) {
        return res.status(400).json({ error: "Invalid or missing token" });
    }

    const user = await User.findOne({ token });
    const progress = user?.progress || 0;

    // 🛠️ ดึงเฉพาะ key ที่เป็นของ user นี้
    const keys = await Key.find({ ownerToken: token, expiresAt: { $gt: new Date() } }).sort({ expiresAt: -1 });

    const keyList = keys.map(k => {
        const timeLeft = k.expiresAt.getTime() - Date.now();
        const hours = Math.floor(timeLeft / 1000 / 60 / 60);
        const minutes = Math.floor(timeLeft / 1000 / 60) % 60;
        const seconds = Math.floor(timeLeft / 1000) % 60;

        return {
            key: k.key,
            expiresAt: k.expiresAt,
            timeLeftFormatted: `${hours.toString().padStart(2, '0')}:${minutes
                .toString()
                .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        };
    });

    return res.json({ progress, keys: keyList });
});

module.exports = router;
