const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/leaves/apply
 * @desc    Submit a new leave application
 * @access  Employee or Admin
 */
router.post('/apply', requireAuth, async (req, res) => {
  try {
    let { employee_id, employee_name, leave_type, number_of_days, description, application_date } = req.body;

    // Use logged in user details if not explicitly provided or for non-admin
    if (req.user.role !== 'admin' || !employee_id) {
      employee_id = req.user.employee_id;
      employee_name = req.user.name;
    }

    // Validation
    if (!employee_id || !employee_name) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Employee Name are required.'
      });
    }

    if (!leave_type || !['Casual', 'Professional'].includes(leave_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave type. Please select either "Casual" or "Professional".'
      });
    }

    const days = parseInt(number_of_days, 10);
    if (isNaN(days) || days <= 0 || days > 90) {
      return res.status(400).json({
        success: false,
        message: 'Number of days must be a positive integer between 1 and 90.'
      });
    }

    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clear reason/description for your leave (at least 5 characters).'
      });
    }

    const newApplication = await db.createApplication({
      employee_id: employee_id.trim().toUpperCase(),
      employee_name: employee_name.trim(),
      leave_type,
      number_of_days: days,
      description: description.trim(),
      application_date: application_date || new Date().toISOString().split('T')[0]
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully! Your application is now Pending approval.',
      application: newApplication
    });
  } catch (error) {
    console.error('Leave application submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit leave application. Please try again.'
    });
  }
});

/**
 * @route   GET /api/leaves/my
 * @desc    Get leave applications for currently logged-in employee + stats
 * @access  Employee / Authenticated
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const employee_id = req.user.employee_id;

    const applications = await db.getApplications({
      employee_id,
      status,
      search
    });

    const stats = await db.getStats(employee_id);

    return res.json({
      success: true,
      stats,
      applications
    });
  } catch (error) {
    console.error('Fetch my leaves error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your leave applications.'
    });
  }
});

/**
 * @route   GET /api/leaves/all
 * @desc    Get all leave applications (Admin only) + stats + search/filter
 * @access  Admin only
 */
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const { employee_id, status, search } = req.query;

    const applications = await db.getApplications({
      employee_id,
      status,
      search
    });

    const stats = await db.getStats();

    return res.json({
      success: true,
      stats,
      applications
    });
  } catch (error) {
    console.error('Fetch all leaves error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave applications.'
    });
  }
});

/**
 * @route   PUT /api/leaves/:id/status
 * @desc    Approve or Reject leave application
 * @access  Admin only
 */
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Permitted statuses are "Approved", "Rejected", or "Pending".'
      });
    }

    const updated = await db.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Leave application #${id} not found.`
      });
    }

    return res.json({
      success: true,
      message: `Application #${id} has been marked as "${status}" successfully.`,
      application: updated
    });
  } catch (error) {
    console.error('Status update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update application status.'
    });
  }
});

/**
 * @route   DELETE /api/leaves/:id
 * @desc    Delete a leave application
 * @access  Admin only
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteApplication(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Leave application #${id} not found or already deleted.`
      });
    }

    return res.json({
      success: true,
      message: `Leave application #${id} deleted successfully.`
    });
  } catch (error) {
    console.error('Delete application error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete application.'
    });
  }
});

module.exports = router;
