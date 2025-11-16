const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

const router = express.Router();

// ===== EMAIL CONFIGURATION =====
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify email configuration on startup
transporter.verify(function (error, success) {
    if (error) {
        console.log('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// ===== FILE UPLOAD CONFIGURATION =====
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Images only (JPEG, JPG, PNG)!'));
        }
    }
});

// ===== REGISTER ROUTE =====
router.post('/register', upload.single('universityId'), async (req, res) => {
    try {
        console.log('Registration request received:', {
            body: req.body,
            file: req.file ? { filename: req.file.filename, size: req.file.size } : 'No file'
        });

        const { username, email, password, role } = req.body;
        const universityIdImage = req.file ? req.file.filename : null;

        // Validation
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!universityIdImage) {
            return res.status(400).json({ message: 'University ID image is required' });
        }

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if this is the first admin user
        let isApproved = false;
        if (role === 'admin') {
            const [existingAdmins] = await pool.execute(
                'SELECT COUNT(*) as adminCount FROM users WHERE role = "admin" AND is_approved = 1'
            );
            
            if (existingAdmins[0].adminCount === 0) {
                isApproved = true;
                console.log('🔑 Auto-approving first admin user');
            }
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, role, university_id_image, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, role, universityIdImage, isApproved]
        );

        const message = isApproved 
            ? 'Admin account created and auto-approved! You can login now.'
            : 'User registered successfully. Pending admin approval.';

        res.status(201).json({ 
            message,
            userId: result.insertId,
            isApproved
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }
        
        res.status(500).json({ 
            message: 'Server error during registration',
            error: error.message 
        });
    }
});

// ===== LOGIN ROUTE =====
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Both email and password are required',
                errorCode: 'MISSING_CREDENTIALS'
            });
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
                errorCode: 'INVALID_EMAIL'
            });
        }

        // Check JWT_SECRET configuration
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error',
                errorCode: 'SERVER_ERROR'
            });
        }

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                errorCode: 'AUTH_FAILED'
            });
        }

        const user = users[0];

        // Check account approval status
        if (!user.is_approved) {
            return res.status(403).json({
                success: false,
                message: 'Account pending approval',
                errorCode: 'ACCOUNT_PENDING'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            console.warn(`Failed login attempt for user ${user.email}`);
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                errorCode: 'AUTH_FAILED'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role,
                iss: 'arellano-athletirank',
                aud: 'arellano-client'
            },
            process.env.JWT_SECRET,
            { 
                expiresIn: '8h',
                algorithm: 'HS256'
            }
        );

        // Set secure HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000
        });

        console.log('✅ Login successful for user:', user.email, 'Role:', user.role);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isApproved: user.is_approved
            },
            token: token
        });

    } catch (error) {
        console.error('Login error:', error);
        
        res.status(500).json({ 
            success: false,
            message: 'Authentication failed',
            errorCode: 'SERVER_ERROR'
        });
    }
});

// ===== FORGOT PASSWORD - REQUEST RESET =====
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        console.log('🔑 Password reset requested for:', email);

        if (!email) {
            return res.status(400).json({ 
                message: 'Email is required' 
            });
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: 'Invalid email format'
            });
        }

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
            [email]
        );

        // Always return success to prevent email enumeration
        if (users.length === 0) {
            console.log('⚠️ Reset requested for non-existent email:', email);
            return res.json({ 
                message: 'If an account exists with that email, a reset link has been sent.' 
            });
        }

        const user = users[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token in database
        await pool.execute(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetTokenHash, resetTokenExpiry, user.id]
        );

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        // Email template
        const mailOptions = {
            from: `"Arellano University ATHLETIRANK" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request - Arellano University ATHLETIRANK',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
                        .button { display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
                        .button:hover { background-color: #45a049; }
                        .footer { background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
                        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
                        .link-box { background-color: #e8f5e9; padding: 15px; border-radius: 4px; word-break: break-all; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hello <strong>${user.username}</strong>,</p>
                            
                            <p>We received a request to reset the password for your Arellano University ATHLETIRANK account.</p>
                            
                            <p>Click the button below to reset your password:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </div>
                            
                            <p>Or copy and paste this link into your browser:</p>
                            <div class="link-box">
                                ${resetUrl}
                            </div>
                            
                            <div class="warning">
                                <strong>⏰ Important:</strong> This link will expire in <strong>1 hour</strong>.
                            </div>
                            
                            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                            
                            <p>For security reasons, please do not share this link with anyone.</p>
                        </div>
                        <div class="footer">
                            <p><strong>Arellano University ATHLETIRANK</strong></p>
                            <p>This is an automated message, please do not reply to this email.</p>
                            <p>If you need assistance, please contact your system administrator.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        console.log('✅ Password reset email sent to:', user.email);

        res.json({ 
            message: 'If an account exists with that email, a reset link has been sent.',
            success: true
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        
        // Don't reveal the actual error to prevent information leakage
        res.status(500).json({ 
            message: 'Error processing password reset request. Please try again later.' 
        });
    }
});

// ===== VERIFY RESET TOKEN =====
router.get('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.query;

        console.log('🔍 Verifying reset token...');

        if (!token) {
            return res.status(400).json({ 
                message: 'Reset token is required',
                valid: false
            });
        }

        // Hash the token to compare with database
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const [users] = await pool.execute(
            'SELECT id, email, username FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [resetTokenHash]
        );

        if (users.length === 0) {
            console.log('⚠️ Invalid or expired reset token');
            return res.status(400).json({ 
                message: 'Invalid or expired reset token',
                valid: false
            });
        }

        console.log('✅ Reset token is valid for user:', users[0].email);

        res.json({ 
            message: 'Token is valid',
            valid: true 
        });

    } catch (error) {
        console.error('❌ Verify token error:', error);
        res.status(500).json({ 
            message: 'Error verifying reset token',
            valid: false
        });
    }
});

// ===== RESET PASSWORD =====
router.post('/reset-password', async (req, res) => {
    let connection;
    try {
        const { token, password } = req.body;

        console.log('🔒 Password reset attempt started...');
        console.log('📝 Token received:', token ? `${token.substring(0, 10)}...` : 'NULL');
        console.log('📝 Password length:', password ? password.length : 'NULL');

        // Validation
        if (!token || !password) {
            console.log('❌ Missing token or password');
            return res.status(400).json({ 
                message: 'Token and new password are required' 
            });
        }

        if (password.length < 8) {
            console.log('❌ Password too short');
            return res.status(400).json({ 
                message: 'Password must be at least 8 characters long' 
            });
        }

        // Get database connection
        connection = await pool.getConnection();
        console.log('✅ Database connection acquired');

        // Hash the token to compare with database
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        console.log('🔑 Hashed token:', resetTokenHash.substring(0, 10) + '...');

        // Find user with valid token
        console.log('🔍 Searching for user with valid token...');
        const [users] = await connection.execute(
            `SELECT id, email, username, reset_token, reset_token_expiry 
             FROM users 
             WHERE reset_token = ? AND reset_token_expiry > NOW()`,
            [resetTokenHash]
        );

        console.log('📊 Users found with valid token:', users.length);

        if (users.length === 0) {
            // Let's check why no users were found
            const [allUsersWithToken] = await connection.execute(
                `SELECT id, email, reset_token, reset_token_expiry, NOW() as current_time
                 FROM users WHERE reset_token = ?`,
                [resetTokenHash]
            );
            
            console.log('🔍 Debug - Users with this token:', allUsersWithToken.length);
            if (allUsersWithToken.length > 0) {
                const user = allUsersWithToken[0];
                console.log('⏰ Token expiry:', user.reset_token_expiry);
                console.log('⏰ Current time:', user.current_time);
                console.log('❌ Token expired:', new Date(user.reset_token_expiry) <= new Date());
            }

            console.log('⚠️ Invalid or expired reset token during password reset');
            return res.status(400).json({ 
                message: 'Invalid or expired reset token' 
            });
        }

        const user = users[0];
        console.log('👤 User found:', user.email, 'ID:', user.id);

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('✅ Password hashed successfully');

        // Update password and reset token fields
        console.log('🔄 Updating user password...');
        const [updateResult] = await connection.execute(
            `UPDATE users 
             SET password = ?, 
                 reset_token = NULL, 
                 reset_token_expiry = NULL,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND reset_token = ?`,
            [hashedPassword, user.id, resetTokenHash]
        );

        console.log('📊 Update result - Affected rows:', updateResult.affectedRows);

        if (updateResult.affectedRows === 0) {
            console.log('❌ No rows affected during password update');
            return res.status(400).json({ 
                message: 'Failed to reset password. User may have been modified.' 
            });
        }

        console.log('✅ Password reset successful for user:', user.email);

        // Verify the update worked
        const [verifyUsers] = await connection.execute(
            'SELECT id, email, reset_token FROM users WHERE id = ?',
            [user.id]
        );

        console.log('🔍 Verification - User still exists:', verifyUsers.length > 0);
        if (verifyUsers.length > 0) {
            console.log('🔍 Verification - Reset token cleared:', verifyUsers[0].reset_token === null);
        }

        if (verifyUsers.length === 0) {
            console.log('❌ USER DISAPPEARED AFTER UPDATE!');
            return res.status(500).json({ 
                message: 'Critical error during password reset. Please contact support.' 
            });
        }

        console.log('✅ User verification passed:', verifyUsers[0].email);

        // Send confirmation email
        try {
            await transporter.sendMail({
                from: `"Arellano University ATHLETIRANK" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Password Changed Successfully',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
                            .footer { background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                            .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✅ Password Changed Successfully</h1>
                            </div>
                            <div class="content">
                                <p>Hello <strong>${user.username}</strong>,</p>
                                <p>Your password has been successfully changed.</p>
                                <p>If you did not make this change, please contact your system administrator immediately.</p>
                                <div class="alert">
                                    <strong>Security Tip:</strong> Never share your password with anyone.
                                </div>
                            </div>
                            <div class="footer">
                                <p><strong>Arellano University ATHLETIRANK</strong></p>
                                <p>This is an automated message, please do not reply.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });
            console.log('✅ Confirmation email sent');
        } catch (emailError) {
            console.log('⚠️ Could not send confirmation email:', emailError.message);
        }

        console.log('🎉 Password reset process completed successfully');
        res.json({ 
            message: 'Password has been reset successfully',
            success: true
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error resetting password. Please try again.' 
        });
    } finally {
        if (connection) {
            connection.release();
            console.log('🔓 Database connection released');
        }
    }
});

// ===== TEST ROUTE =====
router.get('/test', async (req, res) => {
    try {
        const [result] = await pool.execute('SELECT COUNT(*) as userCount FROM users');
        
        res.json({
            message: '✅ Auth service is working',
            database: 'Connected',
            userCount: result[0].userCount,
            jwtSecret: process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing',
            emailService: process.env.EMAIL_USER ? '✅ Configured' : '❌ Missing',
            emailPassword: process.env.EMAIL_PASSWORD ? '✅ Configured' : '❌ Missing',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            message: '❌ Auth service test failed',
            error: error.message
        });
    }
});

module.exports = router;