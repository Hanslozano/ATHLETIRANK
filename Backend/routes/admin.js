const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// Middleware to verify JWT token and admin role
const verifyAdminToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration error' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get fresh user data from database
        const [users] = await pool.execute(
            'SELECT id, username, email, role, is_approved FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token - user not found' 
            });
        }

        const user = users[0];

        // Check if user is approved and is admin
        if (!user.is_approved) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account not approved' 
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin role required.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }

        return res.status(500).json({ 
            success: false, 
            message: 'Server error during authentication' 
        });
    }
};

// Get all users (admin only)
router.get('/users', verifyAdminToken, async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                id,
                username,
                email,
                role,
                is_approved,
                university_id_image,
                created_at,
                updated_at
            FROM users 
            ORDER BY created_at DESC
        `);

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch users',
            error: error.message 
        });
    }
});

// Approve user (admin only)
router.put('/users/:userId/approve', verifyAdminToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [userId]
        );

        if (existingUsers.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update user approval status
        await pool.execute(
            'UPDATE users SET is_approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );

        console.log(`User ${existingUsers[0].username} (${existingUsers[0].email}) approved by admin ${req.user.username}`);

        res.json({ 
            success: true,
            message: 'User approved successfully' 
        });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to approve user',
            error: error.message 
        });
    }
});

// Reject user (admin only)
router.put('/users/:userId/reject', verifyAdminToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [userId]
        );

        if (existingUsers.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update user approval status
        await pool.execute(
            'UPDATE users SET is_approved = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );

        console.log(`User ${existingUsers[0].username} (${existingUsers[0].email}) rejected by admin ${req.user.username}`);

        res.json({ 
            success: true,
            message: 'User rejected successfully' 
        });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to reject user',
            error: error.message 
        });
    }
});

// Delete user (admin only)
router.delete('/users/:userId', verifyAdminToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot delete your own account' 
            });
        }

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id, username, email, university_id_image FROM users WHERE id = ?',
            [userId]
        );

        if (existingUsers.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        const userToDelete = existingUsers[0];

        // Delete user from database
        await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

        // Optionally, delete the university ID image file
        if (userToDelete.university_id_image) {
            const fs = require('fs');
            const path = require('path');
            const imagePath = path.join(__dirname, '..', 'uploads', userToDelete.university_id_image);
            
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log('Deleted image file:', userToDelete.university_id_image);
                }
            } catch (fileError) {
                console.error('Error deleting image file:', fileError);
                // Don't fail the request if file deletion fails
            }
        }

        console.log(`User ${userToDelete.username} (${userToDelete.email}) deleted by admin ${req.user.username}`);

        res.json({ 
            success: true,
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete user',
            error: error.message 
        });
    }
});

// Get user statistics (admin only)
router.get('/stats', verifyAdminToken, async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved_users,
                SUM(CASE WHEN is_approved = 0 THEN 1 ELSE 0 END) as pending_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END) as staff_users
            FROM users
        `);

        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

module.exports = router;