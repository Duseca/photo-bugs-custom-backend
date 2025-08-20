import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private (Admin only)
export const getAllFeedback = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Feedback.countDocuments();

    const feedback = await Feedback.find()
      .populate('user_id', 'name user_name profile_picture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: feedback.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single feedback by ID
// @route   GET /api/feedback/:id
// @access  Private
export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).populate(
      'user_id',
      'name user_name profile_picture'
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    // Check if current user is the owner or admin
    if (
      feedback.user_id._id.toString() !== req.user_id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this feedback',
      });
    }

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new feedback
// @route   POST /api/feedback
// @access  Private
export const createFeedback = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required',
      });
    }

    const feedback = await Feedback.create({
      user_id: req.user_id,
      description,
    });

    const populatedFeedback = await Feedback.findById(feedback._id).populate(
      'user_id',
      'name user_name profile_picture'
    );

    res.status(201).json({
      success: true,
      data: populatedFeedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private
export const updateFeedback = async (req, res) => {
  try {
    const { description } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    // Check if current user is the owner
    if (feedback.user_id.toString() !== req.user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback',
      });
    }

    feedback.description = description || feedback.description;
    await feedback.save();

    const populatedFeedback = await Feedback.findById(feedback._id).populate(
      'user_id',
      'name user_name profile_picture'
    );

    res.status(200).json({
      success: true,
      data: populatedFeedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    // Check if current user is the owner or admin
    if (
      feedback.user_id.toString() !== req.user_id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this feedback',
      });
    }

    await feedback.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get feedback suggestions for current user
// @route   GET /api/feedback/user/suggestions
// @access  Private
export const getUserFeedbackSuggestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Feedback.countDocuments({ user_id: req.user_id });

    const suggestions = await Feedback.find({ user_id: req.user_id })
      .sort({ createdAt: -1 })
      .select('description createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: suggestions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
