import Notification from '../models/Notification.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private (Admin only)
export const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments();

    const notifications = await Notification.find()
      .populate('user_id', 'name user_name email profile_picture')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single notification by ID
// @route   GET /api/notifications/:id
// @access  Private
export const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id).populate(
      'user_id',
      'name user_name email profile_picture'
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check if the current user is the owner or admin
    if (notification.user_id._id.toString() !== req.user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user's notifications
// @route   GET /api/notifications/user/me
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments({ user_id: req.user_id });

    const notifications = await Notification.find({ user_id: req.user_id })
      .populate('user_id', 'name user_name email profile_picture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Create/send notification
// @route   POST /api/notifications
// @access  Private (Admin or system)
export const sendNotification = async (req, res) => {
  try {
    const { user_id, description } = req.body;

    // Validate user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const notification = await Notification.create({
      user_id,
      description,
    });

    const populatedNotification = await Notification.findById(
      notification._id
    ).populate('user_id', 'name user_name email profile_picture');

    // Here you would typically send a real-time notification to the user
    // via websockets or push notification service

    res.status(201).json({
      success: true,
      data: populatedNotification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark a notification as seen
// @route   PUT /api/notifications/:id/seen
// @access  Private
export const markAsSeen = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      { _id: req.params.id, user_id: req.user_id },
      { is_seen: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          'Notification not found or not authorized to update this notification',
      });
    }

    const populatedNotification = await Notification.findById(
      notification._id
    ).populate('user_id', 'name user_name profile_picture');

    res.status(200).json({
      success: true,
      data: populatedNotification,
      message: 'Notification marked as seen successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check if the current user is the owner or admin
    if (notification.user_id.toString() !== req.user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await notification.remove();

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

// // @desc    Send notification to all users
// // @route   POST /api/notifications/broadcast
// // @access  Private (Admin only)
// export const broadcastNotification = async (req, res) => {
//   try {
//     const { description } = req.body;

//     if (!description) {
//       return res.status(400).json({
//         success: false,
//         message: 'Notification description is required'
//       });
//     }

//     // Get all user IDs in batches to avoid memory overload
//     const batchSize = 1000;
//     let lastId = null;
//     let totalSent = 0;

//     do {
//       // Get a batch of users
//       const query = lastId ? { _id: { $gt: lastId } } : {};
//       const users = await User.find(query)
//         .select('_id')
//         .limit(batchSize)
//         .sort('_id')
//         .lean();

//       if (users.length === 0) break;

//       // Prepare notifications for this batch
//       const notifications = users.map(user => ({
//         user_id: user._id,
//         description,
//         createdAt: new Date()
//       }));

//       // Bulk insert for performance
//       await Notification.insertMany(notifications);
//       totalSent += users.length;
//       lastId = users[users.length - 1]._id;

//     } while (true);

//     // Here you would typically:
//     // 1. Send real-time notifications via WebSocket
//     // 2. Send push notifications to mobile devices
//     // 3. Trigger email notifications if needed

//     res.status(200).json({
//       success: true,
//       message: `Notification sent to ${totalSent} users`,
//       data: {
//         description,
//         recipients: totalSent
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
