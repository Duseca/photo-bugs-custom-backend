import Review from '../models/Review';
import mongoose from 'mongoose';

// @desc    Get all reviews
// @route   Get /api/reviews
// @access  Private
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find();

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Get a review by id
// @route   Get /api/reviews/:id
// @access  Private
export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { review_for, ratings, description } = req.body;
    const review_by = req.user_id;

    if (review_by.toString() === review_for.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review yourself',
      });
    }

    const existingReview = await Review.findOne({ review_by, review_for });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this user',
      });
    }

    const review = await Review.create({
      review_by,
      review_for,
      ratings,
      description,
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const { ratings, description } = req.body;
    const reviewId = req.params.id;
    const userId = req.user_id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (review.review_by.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review',
      });
    }

    review.ratings = ratings || review.ratings;
    review.description = description || review.description;
    await review.save();

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user_id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    if (review.review_by.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review',
      });
    }

    const reviewFor = review.review_for;
    await review.remove();

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

// @desc    Get average rating for a user
// @route   GET /api/reviews/average/:userId
// @access  Public
export const getAverageRating = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const result = await Review.aggregate([
      { $match: { review_for: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$ratings' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const averageRating = result[0]?.averageRating || 0;
    const totalReviews = result[0]?.totalReviews || 0;

    res.status(200).json({
      success: true,
      data: {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
