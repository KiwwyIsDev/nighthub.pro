const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
require('dotenv').config(); // ใช้ dotenv แทนการเขียน parser เอง

const fs = require('fs');
const path = require('path');


// Set strictQuery option to suppress the deprecation warning
mongoose.set('strictQuery', false);
const app = express();
app.set('trust proxy', true);
const PORT = 4949;

// ใช้ค่าจาก .env หรือค่าเริ่มต้นถ้าไม่พบ
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secure-key-2025';
const BAN_THRESHOLD = parseInt(process.env.BAN_THRESHOLD || 5);

// Improved logging system
const Logger = {
    LOG_LEVEL: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },
    // Set default log level based on environment with flexible configuration from env vars
    currentLevel: process.env.LOG_LEVEL === 'DEBUG' ? 0 :
                 process.env.LOG_LEVEL === 'INFO' ? 1 :
                 process.env.LOG_LEVEL === 'WARN' ? 2 :
                 process.env.LOG_LEVEL === 'ERROR' ? 3 :
                 process.env.NODE_ENV === 'production' ? 2 : 0,
    
    formatKey: (key) => {
        if (!key) return 'no-key';
        return key.length > 10 ? `${key.substring(0, 3)}***${key.substring(key.length - 3)}` : key;
    },
    
    formatTime: () => {
        return new Date().toISOString();
    },
    
    debug: function(message, data = {}) {
        if (this.currentLevel <= this.LOG_LEVEL.DEBUG) {
            console.log(`[DEBUG][${this.formatTime()}] ${message}`, data);
        }
    },
    
    info: function(message, data = {}) {
        if (this.currentLevel <= this.LOG_LEVEL.INFO) {
            // In production, format the output to be more concise
            if (process.env.NODE_ENV === 'production') {
                let logOutput = `[INFO] ${message}`;
                
                // Add key information if available
                if (data.key) {
                    logOutput += ` | Key: ${this.formatKey(data.key)}`;
                }
                
                // Add IP information if available
                if (data.ip) {
                    logOutput += ` | IP: ${data.ip}`;
                }
                
                // Add execution count if available
                if (data.executionCount !== undefined) {
                    logOutput += ` | Executions: ${data.executionCount}`;
                }
                
                console.log(logOutput);
            } else {
                console.log(`[INFO][${this.formatTime()}] ${message}`, data);
            }
        }
    },
    
    warn: function(message, data = {}) {
        if (this.currentLevel <= this.LOG_LEVEL.WARN) {
            if (process.env.NODE_ENV === 'production') {
                let logOutput = `[WARN] ${message}`;
                
                // Add key information if available
                if (data.key) {
                    logOutput += ` | Key: ${this.formatKey(data.key)}`;
                }
                
                // Add IP information if available
                if (data.ip) {
                    logOutput += ` | IP: ${data.ip}`;
                }
                
                // Add execution count if available
                if (data.executionCount !== undefined) {
                    logOutput += ` | Executions: ${data.executionCount}`;
                }
                
                console.warn(logOutput);
            } else {
                console.warn(`[WARN][${this.formatTime()}] ${message}`, data);
            }
        }
    },
    
    error: function(message, data = {}) {
        if (this.currentLevel <= this.LOG_LEVEL.ERROR) {
            if (process.env.NODE_ENV === 'production') {
                let logOutput = `[ERROR] ${message}`;
                
                // Add key information if available
                if (data.key) {
                    logOutput += ` | Key: ${this.formatKey(data.key)}`;
                }
                
                // Add IP information if available
                if (data.ip) {
                    logOutput += ` | IP: ${data.ip}`;
                }
                
                // Add execution count if available
                if (data.executionCount !== undefined) {
                    logOutput += ` | Executions: ${data.executionCount}`;
                }
                
                console.error(logOutput);
            } else {
                console.error(`[ERROR][${this.formatTime()}] ${message}`, data);
            }
        }
    }
};

console.log(`Server initialized on port ${PORT}`);

// Middleware สำหรับ logging request แบบสั้นและสะอาด
app.use((req, res, next) => {
    // ใน production ให้บันทึกแค่ข้อมูลสำคัญ
    if (process.env.NODE_ENV === 'production') {
        Logger.debug(`${req.method} ${req.path}`, { 
            ip: req.ip,
            userAgent: req.headers['user-agent']?.substring(0, 30)
        });
    } else {
        // ใน development ให้บันทึกแบบละเอียด
        Logger.debug(`${req.method} ${req.path}`, { 
            headers: req.headers,
            body: req.method !== 'GET' ? req.body : undefined
        });
    }
    
    next();
});

// Middleware
app.use(helmet()); // เพิ่ม security headers
app.use(cors({ 
    origin: true, 
    credentials: true,
    exposedHeaders: ['ex-auth-token', 'ex-auth-hmac', 'X-CSRF-Token']
}));

// Make sure JSON body parsing is working correctly
app.use(express.json({ limit: '10mb' }));

// Debug middleware for body parsing
app.use((req, res, next) => {
    if (req.method === 'POST') {
        Logger.debug('Raw body received', req.body);
    }
    next();
});

app.use(cookieParser());

// Create CSRF middleware but don't apply it globally
const csrfProtection = csurf({ 
    cookie: { 
        key: '_csrf',
        path: '/',
        httpOnly: true,
        secure: false, // Changed to false for local development
        sameSite: 'lax'
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Middleware to verify CSRF tokens from our custom system
const verifyTokenCsrf = (req, res, next) => {
    // Check for CSRF token in headers
    const csrfToken = req.headers['x-csrf-token'];
    
    if (!csrfToken) {
        Logger.warn('Missing CSRF token in request headers', { ip: req.ip, path: req.path });
        return res.status(403).json({
            success: false,
            error: 'Missing CSRF token'
        });
    }
    
    // Validate the token against our store
    if (!validateCsrfToken(csrfToken)) {
        Logger.warn('Invalid or expired CSRF token', { ip: req.ip, path: req.path });
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired CSRF token'
        });
    }
    
    next();
};

// CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn('Invalid CSRF token', { ip: req.ip, path: req.path });
        return res.status(403).json({ 
            error: 'Invalid CSRF token',
            message: 'Form has been tampered with'
        });
    }
    next(err);
});

// Route to provide CSRF token
app.get('/csrf-token', (req, res) => {
    const csrfToken = generateCsrfToken();
    storeCsrfToken(csrfToken);
    res.json({ csrfToken });
});

// CSRF token storage - in-memory for development, should use Redis in production
const csrfTokenStore = new Map();

// Function to generate a random CSRF token
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Function to store a CSRF token with expiration (5 minutes)
function storeCsrfToken(token) {
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    csrfTokenStore.set(token, expiresAt);
    
    // Clean up expired tokens occasionally
    if (Math.random() < 0.1) { // 10% chance to run cleanup on each request
        cleanExpiredCsrfTokens();
    }
}

// Function to validate a CSRF token
function validateCsrfToken(token) {
    if (!token || !csrfTokenStore.has(token)) {
        return false;
    }
    
    const expiresAt = csrfTokenStore.get(token);
    if (Date.now() > expiresAt) {
        csrfTokenStore.delete(token); // Clean up expired token
        return false;
    }
    
    return true;
}

// Function to clean up expired CSRF tokens
function cleanExpiredCsrfTokens() {
    const now = Date.now();
    for (const [token, expiresAt] of csrfTokenStore.entries()) {
        if (now > expiresAt) {
            csrfTokenStore.delete(token);
        }
    }
}

// MongoDB Schema
mongoose.connect('mongodb+srv://kiwwy:AP0M9ruHBYZeGieL@whitelist.qnke0x3.mongodb.net/?retryWrites=true&w=majority&appName=Whitelist', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const KeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    hwid: { type: String }, // เก็บเพียง 1 HWID ต่อ key
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    salt: { type: String, required: true },
    executionCount: { type: Number, default: 0 }, // นับจำนวนครั้งที่ใช้งาน
    lastExecuted: { type: Date } // เก็บเวลาล่าสุดที่มีการใช้งาน
});
const KeyModel = mongoose.model('Key', KeySchema);

// เปลี่ยนแปลง Schema สำหรับเก็บข้อมูลการ ban เป็นแบบชั่วคราว
const TempBanSchema = new mongoose.Schema({
    identifier: { type: String, required: true, unique: true }, // เก็บ identifier ชั่วคราว
    reason: { type: String, required: true },
    bannedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // temp ban ต้องมีวันหมดอายุเสมอ
    attempts: { type: Number, default: 1 } // จำนวนครั้งที่พยายามเข้าใช้งานผิดพลาด
});
const TempBanModel = mongoose.model('TempBan', TempBanSchema);

// เพิ่ม Schema สำหรับเก็บข้อมูลการล็อกอินที่ล้มเหลว
const FailedLoginSchema = new mongoose.Schema({
    identifier: { type: String, required: true }, // HWID หรือ IP address
    attemptedKey: { type: String },
    timestamp: { type: Date, default: Date.now },
    ip: { type: String }
});
const FailedLoginModel = mongoose.model('FailedLogin', FailedLoginSchema);

// Utility functions

// Custom encryption functions to replace HMAC
function simpleEncrypt(text, salt) {
    try {
        // Convert salt to string if it's a number
        const saltStr = typeof salt === 'number' ? salt.toString() : salt;
        
        // Create a more advanced XOR cipher with the salt string
        let result = '';
        for (let i = 0; i < text.length; i++) {
            // Get the corresponding salt character based on position
            const saltIndex = i % saltStr.length;
            const saltByte = saltStr.charCodeAt(saltIndex);
            
            // Add position-based complexity to make the encryption more dynamic
            const positionFactor = (i * 3) % 256;
            
            // XOR the text character with the salt character and position factor
            result += String.fromCharCode(text.charCodeAt(i) ^ (saltByte ^ positionFactor));
        }
        
        // Return Base64 encoded result using binary encoding to match Lua's behavior
        return Buffer.from(result, 'binary').toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        return text; // Fallback to plain text if encryption fails
    }
}

function simpleDecrypt(encryptedBase64, salt) {
    try {
        // Convert salt to string if it's a number
        const saltStr = typeof salt === 'number' ? salt.toString() : salt;
        
        // 1. Convert the base64 string to binary data
        const buffer = Buffer.from(encryptedBase64, 'base64');
        
        // 2. Apply enhanced XOR with the salt string characters
        let result = '';
        for (let i = 0; i < buffer.length; i++) {
            // Get the corresponding salt character based on position
            const saltIndex = i % saltStr.length;
            const saltByte = saltStr.charCodeAt(saltIndex);
            
            // Add position-based complexity matching encryption
            const positionFactor = (i * 3) % 256;
            
            // XOR the byte with the salt character code and position factor
            result += String.fromCharCode(buffer[i] ^ (saltByte ^ positionFactor));
        }
        
        return result;
    } catch (error) {
        console.error('Decrypt error:', error);
        return encryptedBase64;
    }
}

// Dynamic XOR with advanced pattern for better security
function dynamicXOREncrypt(text, salt, additionalEntropy = '') {
    try {
        // Create a more complex salt combining multiple factors
        const enhancedSalt = salt + additionalEntropy;
        
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charByte = text.charCodeAt(i);
            const saltIndex = i % enhancedSalt.length;
            const saltByte = enhancedSalt.charCodeAt(saltIndex);
            
            // Add dynamic factors based on position and salt character
            const positionFactor = (i * saltIndex) % 256;
            const dynamicFactor = enhancedSalt.charCodeAt((i * 3) % enhancedSalt.length);
            
            // Complex XOR operation
            const xorValue = saltByte ^ (positionFactor + dynamicFactor);
            result += String.fromCharCode(charByte ^ xorValue);
        }
        
        return Buffer.from(result, 'binary').toString('base64');
    } catch (error) {
        console.error('Dynamic XOR encryption error:', error);
        return Buffer.from(text).toString('base64'); // Fallback
    }
}

function dynamicXORDecrypt(encryptedBase64, salt, additionalEntropy = '') {
    try {
        // Create salt identical to secure_client.lua
        const enhancedSalt = salt + additionalEntropy;
        
        // Only log detailed debugging info in development mode
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${new Date().toISOString()}] Using salt for decryption:`, enhancedSalt);
            console.log(`[${new Date().toISOString()}] Salt length: ${enhancedSalt.length}`);
        }
        
        // Decode base64 to binary buffer
        const buffer = Buffer.from(encryptedBase64, 'base64');
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${new Date().toISOString()}] Encrypted buffer length: ${buffer.length}`);
        }
        
        // Create buffer for result
        const resultBuffer = Buffer.alloc(buffer.length);
        
        // Debug arrays to track values for troubleshooting - only in development
        const debugValues = [];
        
        // *** CRITICAL: Match Lua's code EXACTLY ***
        for (let i = 0; i < buffer.length; i++) {
            // Convert JS 0-based index to Lua 1-based index for calculations
            const luaIndex = i + 1;
            
            // Get the encrypted byte
            const encryptedByte = buffer[i];
            
            // Calculate salt index exactly like Lua: ((i-1) % #dynamicSalt) + 1
            const saltIndex = ((luaIndex - 1) % enhancedSalt.length) + 1;
            const saltByte = enhancedSalt.charCodeAt(saltIndex - 1); // Convert back to 0-based for JS
            
            // Calculate dynamic index exactly like Lua: ((i*3) % #dynamicSalt) + 1
            const dynamicIndex = ((luaIndex * 3) % enhancedSalt.length) + 1;
            const dynamicByte = enhancedSalt.charCodeAt(dynamicIndex - 1); // Convert back to 0-based for JS
            
            // Create positionFactor identical to Lua: (i * 7 + dynamicByte) % 256
            const positionFactor = (luaIndex * 7 + dynamicByte) % 256;
            
            // XOR operation matching Lua's bit32.bxor(charByte, bit32.bxor(saltByte, positionFactor))
            const decryptedByte = encryptedByte ^ (saltByte ^ positionFactor);
            
            // Store the decrypted byte
            resultBuffer[i] = decryptedByte;
            
            // Save debug values for the first few bytes, but only in development mode
            if (process.env.NODE_ENV !== 'production' && i < 5) {
                debugValues.push({
                    index: luaIndex,
                    encryptedByte,
                    saltIndex,
                    saltByte,
                    dynamicIndex,
                    dynamicByte,
                    positionFactor,
                    xorKey: saltByte ^ positionFactor,
                    decryptedByte,
                    hexChar: decryptedByte.toString(16).padStart(2, '0')
                });
            }
        }
        
        // Log debug values for troubleshooting - only in development mode
        if (process.env.NODE_ENV !== 'production' && debugValues.length > 0) {
            console.log(`[${new Date().toISOString()}] Debug values for first 5 bytes:`, JSON.stringify(debugValues, null, 2));
        }
        
        // CRITICAL FIX: Check if the decrypted bytes are actually ASCII hex characters
        // This happens because the Lua client encrypts the hex string characters directly
        if (/^[0-9a-f]$/i.test(String.fromCharCode(resultBuffer[0]))) {
            // If the first byte looks like a hex character, assume all are hex characters
            const hexFromAscii = Array.from(resultBuffer)
                .map(b => String.fromCharCode(b))
                .join('');
            
            if (/^[0-9a-f]{32}$/i.test(hexFromAscii)) {
                // Only log detailed info in development mode
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[${new Date().toISOString()}] Valid hex key detected (directly from ASCII): ${hexFromAscii}`);
                }
                return hexFromAscii.toLowerCase();
            }
        }
        
        // Fallback - return standard hex representation of the buffer
        const hexResult = resultBuffer.toString('hex').toLowerCase();
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${new Date().toISOString()}] Fallback hex conversion: ${hexResult}`);
        }
        
        // Check for exact match with expected format (32 char lowercase hex)
        if (/^[0-9a-f]{32}$/.test(hexResult)) {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[${new Date().toISOString()}] Valid hex key detected (from buffer conversion): ${hexResult}`);
            }
            return hexResult;
        }
        
        // If we get here, the result doesn't match the expected pattern
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${new Date().toISOString()}] Warning: Result doesn't match expected 32-char hex pattern`);
            
            // Try one more fallback - raw ASCII representation
            const asciiResult = Array.from(resultBuffer).map(b => String.fromCharCode(b)).join('');
            console.log(`[${new Date().toISOString()}] Raw ASCII result: ${asciiResult}`);
            
            if (/^[0-9a-f]{32}$/i.test(asciiResult)) {
                console.log(`[${new Date().toISOString()}] Valid hex from ASCII: ${asciiResult}`);
            }
        }
        
        // We still return the hex string as requested
        return hexResult;
    } catch (error) {
        Logger.error(`Dynamic XOR decryption error`, { error: error.message });
        return ""; 
    }
}

/**
 * Generate token verification for authentication instead of HMAC
 * @param {string} token - The JWT token
 * @param {string} salt - Salt value from the token
 * @param {Object} options - Additional options
 * @param {boolean} options.clientMode - If true, uses simpler verification for client compatibility
 * @param {string} options.fingerprint - Browser fingerprint (server mode only)
 * @param {string} options.ip - IP address (server mode only)
 * @param {number} options.iteration - Current iteration count for continuous verification
 * @returns {string} Encrypted verification string
 */
function generateTokenVerification(token, salt, options = {}) {
    const { clientMode = true, fingerprint, ip, iteration = 0 } = options;
    
    let dataToEncrypt = token;
    
    // In client mode, only include token and iteration
    if (clientMode) {
        if (iteration > 0) dataToEncrypt += iteration.toString();
    } else {
        // In server mode, include more entropy
        if (fingerprint) dataToEncrypt += fingerprint;
        if (ip) dataToEncrypt += ip;
        if (iteration > 0) dataToEncrypt += iteration.toString();
    }
    
    // Use simple encryption that can be easily implemented in Lua
    return simpleEncrypt(dataToEncrypt, salt);
}

// Original hash function (keep for backward compatibility)
function hashData(data, salt) {
    return crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex');
}

function generateToken(data) {
    return jwt.sign(data, JWT_SECRET, { expiresIn: '5m' });
}

// Custom decryption for client requests with improved security
function decryptClientData(req, res, next) {
    if (req.body && req.body.encrypted) {
        try {
            if (process.env.NODE_ENV !== 'production') {
                Logger.debug(`Raw encrypted request body`, JSON.stringify(req.body));
            }
            
            // When encrypted flag is found, decrypt the data
            if (req.body.key) {
                // Check encryption type
                if (req.body.encType === 'simple_reverse_b64') {
                    // Handle simple reverse base64 encoding
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Encrypted key with simple reverse base64 received: ${req.body.key}`);
                    }
                    
                    try {
                        // Step 1: Base64 decode
                        const decodedBase64 = Buffer.from(req.body.key, 'base64').toString();
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`After base64 decode: ${decodedBase64}`);
                        }
                        
                        // Step 2: Reverse the string
                        const unreversed = decodedBase64.split('').reverse().join('');
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`After unreverse: ${unreversed}`);
                        }
                        
                        // Check if the result is valid hex (32 chars)
                        if (/^[0-9a-f]{32}$/i.test(unreversed)) {
                            req.body.key = unreversed.toLowerCase();
                            if (process.env.NODE_ENV !== 'production') {
                                Logger.debug(`Successfully decoded simple_reverse_b64 key as valid hex: ${req.body.key}`);
                            }
                        } else {
                            // Not a valid hex string, try padding the base64 string
                            let paddedKey = req.body.key;
                            while (paddedKey.length % 4 !== 0) {
                                paddedKey += '=';
                            }
                            
                            const paddedDecoded = Buffer.from(paddedKey, 'base64').toString();
                            const paddedUnreversed = paddedDecoded.split('').reverse().join('');
                            
                            if (/^[0-9a-f]{32}$/i.test(paddedUnreversed)) {
                                req.body.key = paddedUnreversed.toLowerCase();
                                if (process.env.NODE_ENV !== 'production') {
                                    Logger.debug(`Successfully decoded with padding: ${req.body.key}`);
                                }
                            } else {
                                // Try with URL-safe Base64 decode (replacing - with + and _ with /)
                                const safeKey = req.body.key.replace(/-/g, '+').replace(/_/g, '/');
                                const safeDecoded = Buffer.from(safeKey, 'base64').toString();
                                const safeUnreversed = safeDecoded.split('').reverse().join('');
                                
                                if (/^[0-9a-f]{32}$/i.test(safeUnreversed)) {
                                    req.body.key = safeUnreversed.toLowerCase();
                                    if (process.env.NODE_ENV !== 'production') {
                                        Logger.debug(`Successfully decoded with URL-safe approach: ${req.body.key}`);
                                    }
                                } else {
                                    // Still not valid, log detailed error
                                    Logger.warn(`Failed to decode key as hex. Original: ${req.body.key}, Decoded: ${unreversed}`);
                                }
                            }
                        }
                    } catch (reverseError) {
                        Logger.error(`Error in simple_reverse_b64 decryption: ${reverseError.message}`);
                    }
                } else if (req.body.encType === 'dynamic_xor_b64') {
                    // ใหม่: รองรับการถอดรหัสแบบ dynamic XOR ที่ใช้ saltSeed
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Encrypted key with dynamic XOR received`, { key: req.body.key });
                    }
                    
                    try {
                        // 1. ถอดรหัส saltSeed จาก Base64
                        if (!req.body.saltSeed) {
                            throw new Error('Missing saltSeed for dynamic_xor_b64 decryption');
                        }
                        
                        const decodedSaltSeed = Buffer.from(req.body.saltSeed, 'base64').toString();
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`Decoded saltSeed`, { saltSeed: decodedSaltSeed });
                        }
                        
                        // 2. ถอดรหัส key โดยใช้ dynamicXORDecrypt ที่มีอยู่แล้ว
                        req.body.key = dynamicXORDecrypt(req.body.key, decodedSaltSeed);
                        
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`Decrypted key with dynamic XOR`, { key: req.body.key });
                        }
                    } catch (dynamicDecryptError) {
                        Logger.error(`Dynamic XOR decryption error`, { error: dynamicDecryptError.message });
                        
                        // ทางเลือกสำรอง: ลองถอดรหัสด้วยวิธีเดิมและ salt เดิม
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`Falling back to simpler decryption...`);
                        }
                        
                        // Decode Base64
                        const encryptedBuffer = Buffer.from(req.body.key, 'base64');
                        
                        // Recreate the same dynamic XOR pattern used in client
                        let decryptedKey = '';
                        
                        if (req.body.saltSeed) {
                            // พยายามถอดรหัสตาม pattern ใน client ถ้ามี saltSeed
                            const decodedSalt = Buffer.from(req.body.saltSeed, 'base64').toString();
                            
                            for (let i = 0; i < encryptedBuffer.length; i++) {
                                const saltByte = decodedSalt.charCodeAt(i % decodedSalt.length);
                                const positionFactor = (i * 7 + decodedSalt.charCodeAt((i * 3) % decodedSalt.length)) % 256;
                                decryptedKey += String.fromCharCode(encryptedBuffer[i] ^ (saltByte ^ positionFactor));
                            }
                        } else {
                            // ถ้าไม่มี saltSeed ใช้ salt คงที่ (93)
                            const salt = 93;
                            for (let i = 0; i < encryptedBuffer.length; i++) {
                                decryptedKey += String.fromCharCode(encryptedBuffer[i] ^ salt);
                            }
                        }
                        
                        req.body.key = decryptedKey;
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`Fallback decryption result`, { key: req.body.key });
                        }
                    }
                } else if (req.body.encType === 'simple_xor_b64') {
                    // Log the incoming encrypted key for debugging
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Encrypted key with simple XOR received`, { key: req.body.key });
                    }
                    
                    // Decode using our custom simpleDecrypt function
                    const salt = req.body.xorKey || 93; // Default to 93 if not specified
                    req.body.key = simpleDecrypt(req.body.key, salt);
                    
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Decrypted key with simple XOR`, { key: req.body.key });
                    }
                } else if (req.body.encType === 'xor_b64') {
                    // Old XOR + Base64 decryption
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Encrypted key with legacy XOR received`, { key: req.body.key });
                    }
                    
                    const xorKey = req.body.xorKey || 93;
                    
                    // Decode Base64
                    const decodedBase64 = Buffer.from(req.body.key, 'base64').toString('binary');
                    
                    // Decode XOR
                    let decryptedKey = '';
                    for (let i = 0; i < decodedBase64.length; i++) {
                        const charCode = decodedBase64.charCodeAt(i);
                        decryptedKey += String.fromCharCode(charCode ^ xorKey);
                    }
                    
                    req.body.key = decryptedKey;
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Decrypted key (xor_b64)`, { key: req.body.key });
                    }
                } else {
                    // Legacy encryption (offset +5)
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Encrypted key with legacy offset received`, { key: req.body.key });
                    }
                    
                    let decryptedKey = '';
                    for (let i = 0; i < req.body.key.length; i++) {
                        const char = req.body.key.charAt(i);
                        const byte = char.charCodeAt(0) - 5;
                        decryptedKey += String.fromCharCode(byte);
                    }
                    
                    req.body.key = decryptedKey;
                    if (process.env.NODE_ENV !== 'production') {
                        Logger.debug(`Decrypted key (legacy)`, { key: req.body.key });
                    }
                }
            }
            
            // Remove encryption metadata for security but keep fingerprint
            const fingerprint = req.body.fingerprint;
            delete req.body.encrypted;
            delete req.body.encType;
            delete req.body.xorKey;
            delete req.body.saltSeed;
            
            // Restore fingerprint
            if (fingerprint) {
                req.body.fingerprint = fingerprint;
            }
        } catch (error) {
            Logger.error(`Error decrypting client data`, { error: error.message });
            // Continue processing even if decryption fails
        }
    }
    next();
}

// Middleware สำหรับตรวจสอบความถูกต้องของ timestamp
const verifyTimestamp = (req, res, next) => {
    // ตรวจสอบเฉพาะ request ที่ต้องการความปลอดภัยสูง
    if (req.path === '/verify' || req.path === '/auth/key') {
        const clientTime = parseInt(req.headers['x-timestamp']);
        const now = Math.floor(Date.now() / 1000); // เป็นวินาที
        
        // ถ้าไม่มี timestamp หรือเวลาต่างกันเกิน 60 วินาที
        if (!clientTime || Math.abs(now - clientTime) > 60) {
            console.warn("Timestamp mismatch or missing", { 
                ip: req.ip, 
                clientTime, 
                now, 
                diff: clientTime ? Math.abs(now - clientTime) : 'N/A' 
            });
            return res.status(400).send("Invalid or outdated timestamp");
        }
        
        // เก็บเวลาไว้ใช้ในขั้นตอนต่อไป
        req.clientTimestamp = clientTime;
    }
    
    next();
};

// Middleware สำหรับตรวจสอบ custom CSRF ที่ส่งมาจาก Lua client
const verifyCustomCSRF = (req, res, next) => {
    // ตรวจสอบเฉพาะ request POST ที่ต้องการความปลอดภัยสูง
    if (req.method === 'POST' && (req.path === '/auth/key' || req.path === '/verify')) {
        const customCSRFHeader = req.headers['x-custom-csrf'];
        const customCSRFBody = req.body && req.body.customCSRF;
        
        // ตรวจสอบว่ามีทั้งใน header และ body และต้องตรงกัน
        if (customCSRFHeader && customCSRFBody) {
            if (customCSRFHeader !== customCSRFBody) {
                console.warn(`[${new Date().toISOString()}] Custom CSRF mismatch`, {
                    ip: req.ip,
                    path: req.path,
                    headerLength: customCSRFHeader.length,
                    bodyLength: customCSRFBody.length
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'Security validation failed'
                });
            }
        } else if (req.path === '/auth/key') {
            // บังคับใช้ custom CSRF เฉพาะกับ auth/key endpoint
            if (!customCSRFHeader || !customCSRFBody) {
                console.warn(`[${new Date().toISOString()}] Missing custom CSRF token`, {
                    ip: req.ip,
                    path: req.path,
                    hasHeader: !!customCSRFHeader,
                    hasBody: !!customCSRFBody
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'Missing security token'
                });
            }
        }
    }
    
    next();
};

// Middleware สำหรับตรวจสอบ request signature เพื่อป้องกัน request spoofing
const verifyRequestSignature = (req, res, next) => {
    // ตรวจสอบเฉพาะ request ที่ต้องการความปลอดภัยสูง
    if ((req.method === 'POST' && (req.path === '/auth/key' || req.path === '/verify'))) {
        const clientSignature = req.headers['x-request-signature'];
        const clientTime = req.headers['x-timestamp'];
        const token = req.headers['x-auth-token'] || req.headers['ex-auth-token'];
        
        // ยังไม่บังคับใช้ในเวอร์ชันแรกเพื่อให้รองรับ backward compatibility
        if (!clientSignature) {
            // Only log in development mode - don't show this in production logs
            if (process.env.NODE_ENV !== 'production') {
                Logger.debug(`Missing request signature`, {
                    ip: req.ip,
                    path: req.path
                });
            }
            // ไม่บล็อกตอนนี้ แต่จะเริ่มบังคับใช้ในอนาคต
            // return res.status(401).json({
            //     success: false,
            //     error: "Missing request signature"
            // });
        } else if (token && clientTime) {
            try {
                // ถอดรหัส token เพื่อดึง salt
                const decoded = jwt.verify(token, JWT_SECRET);
                const salt = decoded.salt;
                
                // สร้าง signature เพื่อเปรียบเทียบ - improve URL construction
                // ใช้ protocol + host จาก request headers หรือใช้ fallback ถ้าไม่มี
                const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
                const host = req.headers['host'] || req.get('host') || 'localhost:4949';
                const originalUrl = req.originalUrl || req.url || req.path;
                
                // สร้าง URL แบบเต็มรูปแบบเหมือนกับที่ client ใช้
                const url = `${protocol}://${host}${originalUrl}`;
                const method = req.method;
                
                // สร้างข้อมูลในรูปแบบเดียวกับฝั่ง client
                let dataToSign = url + ":" + method + ":" + token + ":" + clientTime;
                
                // Add debugging for dataToSign
                if (process.env.NODE_ENV !== 'production') {
                    Logger.debug(`Server signature data: ${dataToSign}`);
                }
                
                // รวมข้อมูลจาก body ที่สำคัญ - ในรูปแบบเดียวกับที่ client ส่งมา
                if (req.body) {
                    if (req.body.iteration) {
                        dataToSign += ":iter=" + req.body.iteration;
                    }
                    if (req.body.fingerprint) {
                        // ตัดเอาเฉพาะส่วนแรกเหมือน client
                        dataToSign += ":fp=" + req.body.fingerprint.substring(0, 8);
                    }
                }
                
                // เข้ารหัสและเปรียบเทียบ
                const expectedSignature = simpleEncrypt(dataToSign, salt);
                
                // Log เพื่อตรวจสอบ - only in development mode
                if (process.env.NODE_ENV !== 'production') {
                    Logger.debug(`Signature check:`, {
                        received: clientSignature.substring(0, 10) + '...',
                        expected: expectedSignature.substring(0, 10) + '...',
                        match: clientSignature === expectedSignature
                    });
                }
                
                // Check if there's a signature mismatch but try alternate URL formats in case of reverse proxies
                if (clientSignature !== expectedSignature) {
                    // Try alternative URL formats - this helps with various proxying scenarios
                    const alternativeUrls = [
                        // Try HTTPS with port
                        `https://${host}${originalUrl}`,
                        // Try HTTP with port
                        `http://${host}${originalUrl}`,
                        // Try HTTPS without port for production
                        `https://auth.nighthub.pro${originalUrl}`,
                        // Try localhost with port 4949 for development
                        `http://localhost:4949${originalUrl}`
                    ];
                    
                    let matched = false;
                    for (const altUrl of alternativeUrls) {
                        const altDataToSign = altUrl + ":" + method + ":" + token + ":" + clientTime;
                        
                        // Add the same body elements
                        let fullAltDataToSign = altDataToSign;
                        if (req.body) {
                            if (req.body.iteration) {
                                fullAltDataToSign += ":iter=" + req.body.iteration;
                            }
                            if (req.body.fingerprint) {
                                fullAltDataToSign += ":fp=" + req.body.fingerprint.substring(0, 8);
                            }
                        }
                        
                        const altExpectedSignature = simpleEncrypt(fullAltDataToSign, salt);
                        
                        if (process.env.NODE_ENV !== 'production') {
                            Logger.debug(`Trying alternative URL: ${altUrl}`);
                        }
                        
                        if (clientSignature === altExpectedSignature) {
                            matched = true;
                            if (process.env.NODE_ENV !== 'production') {
                                Logger.debug(`Matched with alternative URL: ${altUrl}`);
                            }
                            break;
                        }
                    }
                    
                    // ถ้า signature ไม่ตรงกันและไม่สามารถใช้ URL ทางเลือกได้ (ยังไม่บังคับตอนนี้)
                    if (!matched && process.env.NODE_ENV !== 'production') {
                        // Only log in development mode - don't pollute production logs
                        Logger.debug(`Signature mismatch after trying alternatives`, {
                            ip: req.ip,
                            path: req.path
                        });
                        
                        // ไม่บล็อกตอนนี้ แต่จะเริ่มบังคับใช้ในอนาคต
                        // return res.status(401).json({
                        //     success: false,
                        //     error: "Invalid request signature"
                        // });
                    }
                }
            } catch (error) {
                // Only log in development mode - don't pollute production logs
                if (process.env.NODE_ENV !== 'production') {
                    Logger.debug(`Signature verification error:`, {
                        ip: req.ip,
                        error: error.message
                    });
                }
                // ไม่บล็อก request ถ้าเกิด error ในการตรวจสอบ
            }
        }
    }
    
    next();
};

// Constants for timestamp encoding
const TIME_FACTOR_A = 12345;
const TIME_FACTOR_B = 67890;
const TIME_FACTOR_C = 31415;
const TIME_HMAC_KEY = process.env.TIME_HMAC_KEY || 'my-static-key';

// Function to encode timestamp with the specified algorithm
function encodeTimestamp(timestamp) {
    try {
        // Apply the encoding algorithm: (timestamp * A + B) ^ C
        const encoded = ((timestamp * TIME_FACTOR_A + TIME_FACTOR_B) ^ TIME_FACTOR_C);
        
        // Convert to string and then to base64
        const base64Encoded = Buffer.from(encoded.toString()).toString('base64');
        
        return base64Encoded;
    } catch (error) {
        console.error('Error encoding timestamp:', error);
        // Fallback to a simple base64 encoding
        return Buffer.from(timestamp.toString()).toString('base64');
    }
}

// Function to create HMAC for timestamp
function generateTimeHmac(encodedTime) {
    return crypto.createHmac('sha256', TIME_HMAC_KEY)
        .update(encodedTime)
        .digest('hex');
}

// Admin key verification middleware
const verifyAdminKey = (req, res, next) => {
    try {
        const adminKey = req.headers['x-admin-key'] || req.body.adminKey;
        
        if (!adminKey || adminKey !== ADMIN_KEY) {
            console.warn(`[${new Date().toISOString()}] Invalid admin key attempt`, { 
                ip: req.ip, 
                key: adminKey ? adminKey.substring(0, 3) + '***' : 'none'
            });
            
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        
        console.log(`[${new Date().toISOString()}] Admin action authorized`, { ip: req.ip });
        next();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Admin verification error:`, error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Helper function to extract fingerprint from request
function getFingerprint(req) {
    // Only check headers - ignore body fingerprint completely
    const headers = req.headers;
    
    // Dynamic header detection based on pattern matching
    for (const headerName in headers) {
        if (/fingerprint|identifier/i.test(headerName)) {
            const fingerprint = headers[headerName];
            Logger.debug(`Found fingerprint in header ${headerName}:`, fingerprint);
            
            // Return the fingerprint if it exists
            if (fingerprint) {
                return fingerprint;
            }
        }
    }
    
    // If no fingerprint header found, use IP address + user agent as fallback (less secure)
    const ip = req.ip || '127.0.0.1';
    const userAgent = headers['user-agent'] || 'unknown';
    Logger.debug(`No fingerprint header found, using IP+UA fallback`);
    return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
}

// Function to check if a user (HWID or IP) is banned
async function checkBan(identifier, isHWID = true) {
    try {
        // Look for an active ban for this identifier
        const ban = await TempBanModel.findOne({
            identifier: identifier,
            expiresAt: { $gt: new Date() } // Only return active bans
        });
        
        if (ban) {
            // Log the ban detection
            console.log(`[${new Date().toISOString()}] Ban detected for ${isHWID ? 'HWID' : 'IP'}: ${identifier.substring(0, 8)}***`);
            return {
                reason: ban.reason,
                expiresAt: ban.expiresAt
            };
        }
        
        // No ban found
        return null;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error checking ban status:`, error);
        // Return null in case of error to avoid blocking legitimate users
        return null;
    }
}

// Function to record failed login attempts and ban users after too many failures
async function recordFailedLogin(fingerprint, key, ip) {
    try {
        // Create a new failed login record
        const failedLogin = new FailedLoginModel({
            identifier: fingerprint,
            attemptedKey: key,
            ip: ip,
            timestamp: new Date()
        });
        
        await failedLogin.save();
        
        // Get count of recent failed attempts (last 30 minutes)
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
        
        const recentFailures = await FailedLoginModel.countDocuments({
            identifier: fingerprint,
            timestamp: { $gt: thirtyMinutesAgo }
        });
        
        console.log(`[${new Date().toISOString()}] Failed login recorded - Recent failures: ${recentFailures}`, {
            fingerprint: fingerprint.substring(0, 8) + '***',
            ip: ip
        });
        
        // If too many failed attempts, ban the user
        if (recentFailures >= BAN_THRESHOLD) {
            // Check if already banned to avoid duplicate bans
            const existingBan = await TempBanModel.findOne({ identifier: fingerprint });
            
            if (!existingBan) {
                // Create a temporary ban (3 hours)
                const banExpiration = new Date();
                banExpiration.setHours(banExpiration.getHours() + 3);
                
                const tempBan = new TempBanModel({
                    identifier: fingerprint,
                    reason: 'Too many failed login attempts',
                    expiresAt: banExpiration,
                    attempts: recentFailures
                });
                
                await tempBan.save();
                
                console.warn(`[${new Date().toISOString()}] Auto-banned HWID for too many failed attempts`, {
                    fingerprint: fingerprint.substring(0, 8) + '***',
                    ip: ip,
                    failures: recentFailures,
                    expiresAt: banExpiration
                });
                
                return true; // Indicates user was banned
            }
        }
        
        return false; // No ban was created
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error recording failed login:`, error);
        return false;
    }
}

// Routes
app.get('/active', (req, res) => {
    Logger.debug(`Active endpoint called from IP: ${req.ip}`);
    res.send('active');
});

// Secure timestamp endpoint
app.get('/timestamp', (req, res) => {
    try {
        // Get current server timestamp in seconds
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Encode the timestamp
        const encodedTime = encodeTimestamp(timestamp);
        
        // Generate HMAC for the encoded timestamp
        const hmac = generateTimeHmac(encodedTime);
        
        // Return the encoded timestamp and its HMAC
        res.json({
            time: encodedTime,
            hmac: hmac
        });
        
        Logger.debug(`Timestamp requested`, { ip: req.ip, timestamp });
    } catch (error) {
        Logger.error(`Timestamp error`, { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// API routes that need CSRF protection
app.post('/auth/key', verifyTokenCsrf, decryptClientData, verifyTimestamp, verifyCustomCSRF, verifyRequestSignature, async (req, res) => {
    try {
        Logger.debug(`Auth key request received from IP: ${req.ip}`);
        const { key } = req.body;
        const fingerprint = getFingerprint(req);
        const clientIP = req.ip;
        
        if (!fingerprint || !key) {
            Logger.warn(`Missing key or fingerprint`, { ip: clientIP, key });
            return res.status(400).json({
                success: false,
                error: 'Missing key or fingerprint'
            });
        }
        
        // ตรวจสอบว่า HWID ถูกแบนหรือไม่
        const hwidBan = await checkBan(fingerprint, true);
        if (hwidBan) {
            Logger.warn(`Banned HWID attempted to authenticate`, { 
                ip: clientIP,
                fingerprint: fingerprint.substring(0, 8) + '***',
                key: Logger.formatKey(key)
            });
            return res.status(403).json({
                success: false,
                error: `Your device is banned: ${hwidBan.reason}`
            });
        }
        
        // ตรวจสอบว่า IP ถูกแบนหรือไม่
        const ipBan = await checkBan(clientIP, false);
        if (ipBan) {
            Logger.warn(`Banned IP attempted to authenticate`, { 
                ip: clientIP,
                key: Logger.formatKey(key)
            });
            return res.status(403).json({
                success: false,
                error: `Your IP is banned: ${ipBan.reason}`
            });
        }

        // Clean expired keys first
        try {
            const currentDate = new Date();
            const oneDayAgo = new Date(currentDate);
            oneDayAgo.setDate(currentDate.getDate() - 1);

            const deleteResult = await KeyModel.deleteMany({ expiresAt: { $lt: oneDayAgo } });
            if (deleteResult.deletedCount > 0) {
                Logger.info(`Cleaned expired keys`, { count: deleteResult.deletedCount });
            }
        } catch (cleanError) {
            Logger.error(`Error cleaning expired keys`, { error: cleanError.message });
            // Continue with the main logic even if cleaning fails
        }

        const keyData = await KeyModel.findOne({ key });
        Logger.debug(`Key verification`, { keyFound: !!keyData });
        if (!keyData) {
            // บันทึกการล็อกอินที่ล้มเหลวและตรวจสอบว่าเกินขีดจำกัดหรือไม่
            const autoBanned = await recordFailedLogin(fingerprint, key, clientIP);
            
            // แจ้งข้อความตามสถานะ (ถูก ban หรือไม่)
            if (autoBanned) {
                Logger.warn(`Auto-banned due to too many failed attempts`, { 
                    ip: clientIP,
                    fingerprint: fingerprint.substring(0, 8) + '***',
                    key: Logger.formatKey(key)
                });
                return res.status(403).json({
                    success: false,
                    error: `Your device has been automatically banned due to too many failed login attempts`
                });
            }
            
            Logger.warn(`Invalid key attempt`, { ip: clientIP, key: Logger.formatKey(key) });
            return res.status(403).json({
                success: false,
                error: 'Invalid key'
            });
        }

        // เช็คว่า key หมดอายุหรือไม่
        if (keyData.expiresAt < new Date()) {
            Logger.warn(`Expired key`, { ip: clientIP, key: Logger.formatKey(key) });
            return res.status(403).json({
                success: false,
                error: 'Expired key'
            });
        }

        // เช็คว่าเป็นการใช้งานครั้งแรกหรือไม่ (ยังไม่มี HWID)
        if (!keyData.hwid) {
            // ถ้าเป็นครั้งแรก ให้ assign HWID กับ key
            const salt = crypto.randomBytes(16).toString('hex');
            const hashedFingerprint = hashData(fingerprint, salt);
            keyData.hwid = hashedFingerprint;
            keyData.salt = salt;
            keyData.used = true;
            await keyData.save();
            
            Logger.info(`First-time key authentication - HWID assigned`, { 
                key: Logger.formatKey(keyData.key), 
                ip: clientIP 
            });
        } else {
            // ถ้าไม่ใช่ครั้งแรก เช็คว่า HWID ตรงกับที่เคยลงทะเบียนไว้หรือไม่
            const hashedFingerprint = hashData(fingerprint, keyData.salt);
            if (hashedFingerprint !== keyData.hwid) {
                // บันทึกความพยายามใช้ key บน HWID อื่น
                await recordFailedLogin(fingerprint, key, clientIP);
                
                Logger.warn(`HWID mismatch - key already used on another device`, { 
                    ip: clientIP, 
                    key: Logger.formatKey(key) 
                });
                return res.status(403).json({
                    success: false,
                    error: 'Key already used on another device'
                });
            }
            
            Logger.info(`Key authentication - HWID verified`, { 
                key: Logger.formatKey(keyData.key), 
                ip: clientIP 
            });
        }

        // สร้าง token ใหม่สำหรับ session นี้
        const token = generateToken({ 
            hwid: keyData.hwid, 
            salt: keyData.salt,
            // Include timestamp in the token for easier extraction on client
            timestamp: Math.floor(Date.now() / 1000)
        });
        
        // Generate a verification string using our new custom encryption approach
        const verification = generateTokenVerification(token, keyData.salt, {
            clientMode: true
        });
        
        // Set headers for token and verification - no cookie needed
        res.set('x-auth-token', token);
        res.set('x-auth-verification', verification);
        
        // Success response logging
        Logger.info(`Authentication successful`, { key: Logger.formatKey(key) });
        
        // Include token and verification string in response body for maximum compatibility
        res.json({
            success: true,
            message: 'Key verified',
            token: token,
            verification: verification
        });
    } catch (error) {
        Logger.error(`Auth error`, { error: error.message, ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Verification endpoint - doesn't need CSRF
app.post('/verify', verifyCustomCSRF, verifyRequestSignature, async (req, res) => {
    try {
        Logger.debug(`Verify request received from IP: ${req.ip}`);
        
        // Support both new x-auth-* and old ex-auth-* headers for backward compatibility
        const token = req.headers['x-auth-token'] || req.headers['ex-auth-token'] || req.body.token;
        const clientVerification = req.headers['x-auth-verification'] || req.headers['ex-auth-hmac'] || req.body.verification;
        const clientIteration = parseInt(req.body.iteration || 0);
        const fingerprint = getFingerprint(req) || req.body.fingerprint;
        
        if (!token || !clientVerification) {
            Logger.warn(`Missing token or verification string`, { ip: req.ip });
            return res.status(400).json({ 
                success: false, 
                error: "Missing required authentication parameters" 
            });
        }
        
        let decoded;
        try {
            // Verify and decode the JWT token
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (tokenError) {
            // Don't reveal specific token errors
            Logger.warn(`Invalid token`, { ip: req.ip, error: tokenError.message });
            return res.status(401).json({ 
                success: false, 
                error: "Authentication failed" 
            });
        }
        
        // Find the key data associated with this token
        const keyData = await KeyModel.findOne({ 
            hwid: decoded.hwid,
            salt: decoded.salt
        });
        
        if (!keyData) {
            Logger.warn(`Key not found for token`, { ip: req.ip });
            return res.status(401).json({ 
                success: false, 
                error: "Authentication failed" 
            });
        }
        
        // Set key data for logging
        res.locals.keyData = keyData;
        
        // Check if key is expired
        if (keyData.expiresAt < new Date()) {
            Logger.warn(`Expired key used for verification`, { 
                ip: req.ip, 
                key: Logger.formatKey(keyData.key) 
            });
            return res.status(403).json({ 
                success: false, 
                error: "Key expired" 
            });
        }
        
        // Calculate expected verification string with current iteration
        const expectedVerification = generateTokenVerification(token, keyData.salt, {
            clientMode: true,
            iteration: clientIteration
        });
        
        // Next iteration verification string for handling race conditions
        const nextIterationVerification = generateTokenVerification(token, keyData.salt, {
            clientMode: true,
            iteration: clientIteration + 1
        });
        
        // Verify the provided verification string matches what we expect
        let verified = false;
        let newIteration = clientIteration;
        
        if (clientVerification === expectedVerification) {
            // Verification passed with current iteration
            verified = true;
        } else if (clientVerification === nextIterationVerification) {
            // Verification passed with next iteration (client and server were out of sync)
            verified = true;
            newIteration = clientIteration + 1;
            Logger.debug(`Client iteration advanced`, { 
                ip: req.ip, 
                oldIteration: clientIteration, 
                newIteration 
            });
        }
        
        if (!verified) {
            Logger.warn(`Verification failed`, { 
                ip: req.ip, 
                key: Logger.formatKey(keyData.key),
                iteration: clientIteration
            });
            return res.status(401).json({ 
                success: false, 
                error: "Authentication failed" 
            });
        }
        
        // Update execution metrics for the key
        keyData.executionCount += 1;
        keyData.lastExecuted = new Date();
        await keyData.save();
        
        Logger.warn(`Verification successful`, { 
            key: Logger.formatKey(keyData.key),
            ip: req.ip,
            executionCount: keyData.executionCount 
        });
        
        // Calculate the next iteration for continuous verification
        const nextIteration = newIteration + 1;
        
        // Generate verification string for next iteration that client will use
        const nextVerification = generateTokenVerification(token, keyData.salt, {
            clientMode: true,
            iteration: nextIteration
        });
        
        // Set headers for compatibility (with both naming conventions for backward compatibility)
        res.set('x-auth-token', token);
        res.set('x-auth-verification', nextVerification);
        
        // Send success response with continue flag and next iteration
        return res.json({
            success: true,
            key: keyData.key.substring(0, 3) + '***' + keyData.key.substring(keyData.key.length - 3),
            executionCount: keyData.executionCount,
            expiresAt: keyData.expiresAt,
            nextIteration: nextIteration,
            nextVerification: nextVerification,
            token: token, // Include token in body for maximum compatibility
            verification: nextVerification, // Include verification string in body for maximum compatibility
            continueIteration: true // Flag to indicate client should continue iteration
        });
    } catch (error) {
        Logger.error(`Error in verify endpoint`, { error: error.message, ip: req.ip });
        return res.status(500).json({ 
            success: false, 
            error: "Server error" 
        });
    }
});

// Modify the key generation code to generate a key with a proper salt
// and handle the verification using our new custom encryption
app.post('/generate-key', verifyAdminKey, async (req, res) => {
    try {
        const expiresIn = req.body.expiresIn || '24h'; // Default to 24 hours
        
        // Generate a new random key and salt
        const key = crypto.randomBytes(16).toString('hex');
        const salt = crypto.randomBytes(16).toString('hex');
        
        // Calculate expiration date
        const expiresAt = new Date();
        
        if (expiresIn.endsWith('h')) {
            expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
        } else if (expiresIn.endsWith('d')) {
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
        } else if (expiresIn.endsWith('m')) {
            expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiresIn));
        } else {
            // Default to hours if format is not recognized
            expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn || '24'));
        }
        
        // Create the new key in the database
        const newKey = new KeyModel({
            key,
            salt,
            expiresAt,
            used: false,
            executionCount: 0
        });
        
        await newKey.save();
        
        Logger.info(`Generated new key`, { 
            key, 
            expiresAt,
            ip: req.ip
        });
        
        res.json({
            success: true,
            key: key,
            expiresAt: expiresAt,
            expiresIn: expiresIn
        });
    } catch (error) {
        Logger.error(`Error generating key`, { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Error generating key' 
        });
    }
});


app.get("/script/test", (req, res) => {
    const filePath = path.join(__dirname, 'scripts', 'test.lua');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Failed to load script');
        }

        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    });
}
);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
