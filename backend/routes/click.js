const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Rate limiting: 1 second between clicks
const clickCooldown = new Map();

function isValidUUID(token) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
}

function checkRateLimit(token, updateTimestamp = false) {
    const lastClick = clickCooldown.get(token);
    const now = Date.now();
    
    console.log(`[RATE_LIMIT] Token: ${token.substring(0, 8)}..., LastClick: ${lastClick}, Now: ${now}, Diff: ${lastClick ? now - lastClick : 'N/A'}, UpdateTimestamp: ${updateTimestamp}`);
    
    if (lastClick && now - lastClick < 1000) { // 1 second delay
        console.log(`[RATE_LIMIT] BLOCKED - Time since last click: ${now - lastClick}ms`);
        return {
            allowed: false,
            timeLeft: Math.ceil((1000 - (now - lastClick)) / 1000)
        };
    }
    
    if (updateTimestamp) {
        clickCooldown.set(token, now);
        console.log(`[RATE_LIMIT] Updated timestamp for ${token.substring(0, 8)}... to ${now}`);
    }
    return { allowed: true, timeLeft: 0 };
}

// GET /click/status - Check click tracking status
router.get("/status", async (req, res) => {
    const token = req.cookies.token;
    if (!token || !isValidUUID(token)) {
        return res.status(400).json({ error: "Invalid or missing token" });
    }

    try {
        const user = await User.findOne({ token });
        const rateLimit = checkRateLimit(token, false); // Don't update timestamp for status check
        
        return res.json({ 
            status: "active",
            progress: user?.progress || 0,
            lastActivity: user?.lastSourceTimestamp || null,
            canClick: rateLimit.allowed,
            timeUntilNextClick: rateLimit.timeLeft
        });
    } catch (error) {
        console.error("[CLICK_STATUS] Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
});

// POST /click/register - Register a click event
router.post("/register", async (req, res) => {
    const token = req.cookies.token;
    if (!token || !isValidUUID(token)) {
        return res.status(400).json({ error: "Invalid or missing token" });
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(token, true); // Update timestamp for register
    if (!rateLimit.allowed) {
        return res.status(429).json({ 
            error: "Rate limit exceeded",
            message: `Please wait ${rateLimit.timeLeft} second(s) before clicking again`,
            timeUntilNextClick: rateLimit.timeLeft
        });
    }

    try {
        // Find or create user
        const user = await User.findOneAndUpdate(
            { token },
            { 
                $setOnInsert: { 
                    token,
                    progress: 0,
                    createdAt: new Date(),
                    keys: []
                }
            },
            { upsert: true, new: true }
        );

        return res.json({ 
            success: true,
            message: "Click registered successfully",
            progress: user.progress,
            timeUntilNextClick: 1 // 1 second until next click allowed
        });
    } catch (error) {
        console.error("[CLICK_REGISTER] Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;