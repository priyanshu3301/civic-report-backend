import express from 'express';
import mongoose from 'mongoose';
import { protect, admin } from '../middleware/authMiddleware.js';
import Report from '../models/Report.js';

const router = express.Router();

// @route   POST api/reports
// @desc    Create a new report
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, department, location, media, severity } = req.body;

    const report = new Report({
      title,
      description,
      department,
      location,
      media: media || [],
      severity,
      user: req.user.id,
    });

    const createdReport = await report.save();
    res.status(201).json(createdReport);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ msg: 'Validation failed', errors: messages });
    }
    console.error('Error creating report:', error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports/mine
// @desc    Get all reports by logged-in user
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user.id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports
// @desc    Get all reports (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
      
    res.json(reports);
  } catch (error) {
    console.error('Error fetching all reports:', error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports/:id
// @desc    Get single report by ID or reportId
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    let report;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      report = await Report.findById(req.params.id).populate('user', 'name email');
    }
    if (!report) {
      report = await Report.findOne({ reportId: req.params.id }).populate(
        'user',
        'name email'
      );
    }

    if (!report) return res.status(404).json({ msg: 'Report not found' });

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/reports/:id
// @desc    Update report (owner or admin)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let report;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      report = await Report.findById(req.params.id);
    }
    if (!report) {
      report = await Report.findOne({ reportId: req.params.id });
    }

    if (!report) return res.status(404).json({ msg: 'Report not found' });

    // Check authorization: Owner OR Admin can update
    const isOwner = report.user && report.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const {
      title,
      description,
      department,
      location,
      media,
      severity,
      status,
    } = req.body;

    // Update fields
    report.title = title || report.title;
    report.description = description ?? report.description;
    report.department = department || report.department;
    report.location = location || report.location;
    report.media = media || report.media;
    report.severity = severity || report.severity;
    report.status = status || report.status;

    const updatedReport = await report.save();
    
    await updatedReport.populate('user', 'name email');
    res.json(updatedReport);
    
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ msg: 'Validation failed', errors: messages });
    }
    console.error('Error updating report:', error.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/reports/:id
// @desc    Delete a report (owner or admin)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    let report;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      report = await Report.findById(req.params.id);
    }

    if (!report) {
      report = await Report.findOne({ reportId: req.params.id });
    }

    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }

    // Check authorization: Owner OR Admin can delete
    const isOwner = report.user && report.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await report.deleteOne();

    res.json({ msg: 'Report deleted successfully' });

  } catch (error) {
    console.error('Error deleting report:', error.message);
    res.status(500).json({
      msg: 'Server Error',
      error: error.message,
    });
  }
});

export default router;