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

export default router;