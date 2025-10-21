import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Report from '../models/Report.js';

const router = express.Router();

// @route   POST api/reports
// @desc    Create a new report
// @access  Private
router.post('/', protect, async (req, res) => {
  const { title, description } = req.body;

  try {
    const report = new Report({
      title,
      description,
      user: req.user.id, // Get user ID from the token via middleware
    });

    const createdReport = await report.save();
    res.status(201).json(createdReport);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports/mine
// @desc    Get all reports for the logged-in user
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user.id });
    res.json(reports);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports/:id
// @desc    Get a single report by its ID
// @access  Public (for now)
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error(error.message);
    // If the ID is not a valid format, it will throw an error
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    res.status(500).send('Server Error');
  }
});

export default router;