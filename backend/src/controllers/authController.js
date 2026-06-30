const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { blacklistToken } = require('../services/redisClient');

// ===============================
// HELPER FUNCTIONS
// ===============================

const generateAccessToken = (id, userType) => {
    return jwt.sign(
        { id, userType },
        process.env.JWT_SECRET || 'super_secret_access_key',
        { expiresIn: '30m' }
    );
};

const generateRefreshToken = (id, userType) => {
    return jwt.sign(
        { id, userType },
        process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key',
        { expiresIn: '7d' }
    );
};

const sendRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        // secure: false,
        // sameSite: process.env.NODE_ENV==='production'?'strict':'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

// ===============================
// PATIENT AUTHENTICATION
// ===============================

exports.registerPatient = async (req, res) => {
    try {
        let { name, email, password, phone_number } = req.body;

        if (!name || !email || !password || !phone_number) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        email = email.toLowerCase(); // Enforce lowercase email

        const existingUser = await db.query('SELECT patient_id FROM patients WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Email is already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await db.query(
            `INSERT INTO patients (name, email, password_hash, phone_number) VALUES ($1,$2,$3,$4)`,
            [name, email, passwordHash, phone_number]
        );

        res.status(201).json({ success: true, message: 'Patient registered successfully.' });

    } catch (error) {
        console.error('Patient Registration Error:', error);
        res.status(500).json({ success: false, error: 'Server error during registration.' });
    }
};

exports.loginPatient = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        email = email.toLowerCase();

        const patientData = await db.query('SELECT * FROM patients WHERE email = $1', [email]);

        if (patientData.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid credentials.' });
        }

        const patient = patientData.rows[0];

        // DEFENSE: Prevent bcrypt crash if database column is missing/renamed
        if (!patient.password_hash) {
            console.error('CRITICAL: patient.password_hash is undefined.');
            return res.status(500).json({ success: false, error: 'Server configuration error.' });
        }

        const isMatch = await bcrypt.compare(password, patient.password_hash);

        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Invalid credentials.' });
        }

        const accessToken = generateAccessToken(patient.patient_id, 'patient');
        const refreshToken = generateRefreshToken(patient.patient_id, 'patient');

        sendRefreshTokenCookie(res, refreshToken);

        res.status(200).json({
            success: true,
            refreshToken,
            accessToken,
            user: { id: patient.patient_id, name: patient.name, email: patient.email }
        });

    } catch (error) {
        console.error('Patient Login Error:', error);
        res.status(500).json({ success: false, error: 'Server error during login.' });
    }
};

// ===============================
// LAB AUTHENTICATION
// ===============================

exports.registerLab = async (req, res) => {
    try {
        let { name, email, password, address_text, latitude, longitude } = req.body;

        if (!name || !email || !password || !address_text || latitude == null || longitude == null) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        email = email.toLowerCase();

        const existingLab = await db.query('SELECT lab_id FROM labs WHERE email = $1', [email]);

        if (existingLab.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Email is already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await db.query(
            `INSERT INTO labs (name, email, password_hash, address_text, location_coordinates) 
             VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5,$6),4326)::geography)`,
            [name, email, passwordHash, address_text, longitude, latitude]
        );

        res.status(201).json({ success: true, message: 'Diagnostic Center registered successfully. Pending verification.' });

    } catch (error) {
        console.error('Lab Registration Error:', error);
        res.status(500).json({ success: false, error: 'Server error during lab registration.' });
    }
};

exports.loginLab = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        email = email.toLowerCase();

        const labData = await db.query('SELECT * FROM labs WHERE email = $1', [email]);

        if (labData.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid credentials.' });
        }

        const lab = labData.rows[0];

        // DEFENSE: Prevent bcrypt crash
        if (!lab.password_hash) {
            console.error('CRITICAL: lab.password_hash is undefined.');
            return res.status(500).json({ success: false, error: 'Server configuration error.' });
        }

        const isMatch = await bcrypt.compare(password, lab.password_hash);

        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Invalid credentials.' });
        }

        const accessToken = generateAccessToken(lab.lab_id, 'lab');
        const refreshToken = generateRefreshToken(lab.lab_id, 'lab');

        sendRefreshTokenCookie(res, refreshToken);

        res.status(200).json({
            success: true,
            refreshToken,
            accessToken,
            user: { id: lab.lab_id, name: lab.name, email: lab.email, is_verified: lab.is_verified }
        });

    } catch (error) {
        console.error('Lab Login Error:', error);
        res.status(500).json({ success: false, error: 'Server error during login.' });
    }
};

// ===============================
// REFRESH TOKEN
// ===============================

exports.refreshToken = (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        return res.status(401).json({ success: false, error: 'No refresh token provided.' });
    }

    jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key',
        (err, decoded) => {
            if (err) {
                return res.status(403).json({ success: false, error: 'Invalid or expired refresh token.' });
            }

            const accessToken = generateAccessToken(decoded.id, decoded.userType);
            return res.status(200).json({ success: true, accessToken });
        }
    );
};

// ===============================
// LOGOUT
// ===============================

exports.logout = async (req, res) => {
    // 1. Clear the secure cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    // 2. Blacklist the current access token (if provided)
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                const expiresIn = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
                await blacklistToken(token, expiresIn);
            }
        } catch (err) {
            console.error("Failed to blacklist token during logout:", err);
        }
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};