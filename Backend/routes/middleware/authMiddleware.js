const jwt = require('jsonwebtoken');
const { pool } = require('../../config/database');

const authenticateToken = async (req, res, next) => {
    try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.token || 
                     req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('❌ No token found in cookies or headers');
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required',
                errorCode: 'NO_TOKEN'
            });
        }

        console.log('🔐 Token found, verifying...');

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded:', decoded);

        // Get fresh user data from database
        const [users] = await pool.execute(
            'SELECT id, username, email, role, is_approved FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            console.log('❌ User not found in database');
            return res.status(401).json({ 
                success: false,
                message: 'User not found',
                errorCode: 'USER_NOT_FOUND'
            });
        }

        const user = users[0];
        console.log('✅ User found:', user.username, 'Role:', user.role);

        // Check if user is still approved
        if (!user.is_approved) {
            return res.status(403).json({ 
                success: false,
                message: 'Account access revoked',
                errorCode: 'ACCESS_REVOKED'
            });
        }

        // Attach user to request object
        req.user = {
            id: user.id,
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            console.log('❌ Invalid token');
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token',
                errorCode: 'INVALID_TOKEN'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            console.log('❌ Token expired');
            return res.status(401).json({ 
                success: false,
                message: 'Token expired',
                errorCode: 'TOKEN_EXPIRED'
            });
        }

        console.error('❌ Authentication error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Authentication failed',
            errorCode: 'AUTH_ERROR'
        });
    }
};

module.exports = { authenticateToken };