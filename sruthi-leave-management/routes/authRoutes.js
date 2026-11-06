const express = require('express');
const router = express.Router();
const db = require('../config/db');
const security = require('../utils/security');
const { requireAuth } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new employee
 */
router.post('/register', async (req, res) => {
  try {
    const { employee_id, name, email, password, department } = req.body;

    // Validation
    if (!employee_id || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Employee ID, Name, Email, and Password.'
      });
    }

    const cleanEmpId = employee_id.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await db.findUserByIdentifier(cleanEmpId);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `Employee ID "${cleanEmpId}" is already registered. Please login instead.`
      });
    }

    const existingEmail = await db.findUserByIdentifier(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Email address "${cleanEmail}" is already registered.`
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.'
      });
    }

    const newUser = await db.createUser({
      employee_id: cleanEmpId,
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'employee',
      department: department ? department.trim() : 'General'
    });

    const token = security.generateToken({
      id: newUser.id,
      employee_id: newUser.employee_id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Sruthi Leave Management.',
      token,
      user: {
        id: newUser.id,
        employee_id: newUser.employee_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during registration. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login for Employees and Admins
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, expectedRole } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both your Employee ID / Email and Password.'
      });
    }

    const user = await db.findUserByIdentifier(identifier.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found with this Employee ID or Email.'
      });
    }

    // Verify Password
    const isMatch = security.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify and try again.'
      });
    }

    // Role check if login page specified role
    if (expectedRole && user.role !== expectedRole) {
      if (expectedRole === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This account does not have Administrator privileges. Please use the Employee Portal.'
        });
      } else if (expectedRole === 'employee' && user.role === 'admin') {
        // Admin logging in via employee portal: allow or guide
        // We'll allow it with clear admin redirection
      }
    }

    const token = security.generateToken({
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'General'
    });

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || 'General'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user profile
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * @route   GET /api/auth/db-status
 * @desc    Check database status
 */
router.get('/db-status', (req, res) => {
  return res.json({
    success: true,
    status: db.getStatus()
  });
});

/**
 * @route   POST /api/auth/reconnect-db
 * @desc    Attempt reconnecting to MySQL
 */
router.post('/reconnect-db', async (req, res) => {
  const status = await db.reconnect();
  return res.json({
    success: true,
    status
  });
});

module.exports = router;
