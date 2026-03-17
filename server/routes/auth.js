// ===== AUTH ROUTES =====
import { Router } from 'express';
import User from '../models/User.js';
import { protect, generateToken } from '../middleware/auth.js';

const router = Router();

// ===== VALIDATION HELPERS =====
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validatePassword(password) {
    const errors = [];
    if (password.length < 4) errors.push('at least 4 characters');
    return errors;
}

// POST /api/auth/google — Sign in with Google ID token
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Google credential is required.'
            });
        }

        // Decode the Google JWT (ID token) payload
        // Google ID tokens are JWTs — we decode the payload to get user info.
        // For production, verify with google-auth-library; for now we decode + trust HTTPS origin.
        const parts = credential.split('.');
        if (parts.length !== 3) {
            return res.status(400).json({ success: false, message: 'Invalid credential format.' });
        }

        const payload = JSON.parse(
            Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        );

        const { sub: googleId, name, email, picture } = payload;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email not found in Google token.' });
        }

        // Find or create user
        let user = await User.findOne({ email });

        if (user) {
            // Update Google info if needed
            if (!user.googleId) user.googleId = googleId;
            if (picture && !user.photoURL) user.photoURL = picture;
            if (name && user.name === 'User') user.name = name;
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                name: name || 'User',
                email,
                googleId,
                photoURL: picture || null,
                role: 'user'
            });
        }

        // Generate JWT
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Google sign-in successful!',
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Google sign-in failed. Please try again.'
        });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required.'
            });
        }

        // Validate email format
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format.'
            });
        }

        // Validate password strength
        const pwErrors = validatePassword(password);
        if (pwErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Weak password — must include: ${pwErrors.join(', ')}.`
            });
        }

        // Check if email already registered
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            phone: phone || '',
            password,
            role: role || 'user'
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: user.toJSON()
        });
    } catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join('. ')
            });
        }
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        // Validate email format
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format.'
            });
        }

        // Find user (include password for comparison)
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// GET /api/auth/me — Get current user (protected)
router.get('/me', protect, async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// PUT /api/auth/profile — Update profile (protected)
router.put('/profile', protect, async (req, res) => {
    try {
        const updates = {};
        const allowed = ['name', 'phone', 'location', 'bio', 'skills', 'pricePerHour', 'isAvailable', 'coordinates', 'role'];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated!',
            user
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.'
        });
    }
});

export default router;
