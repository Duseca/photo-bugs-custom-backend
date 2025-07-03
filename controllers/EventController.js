import Event from '../models/Event';
import User from '../models/User';
import sendEmail from '../utils/sendEmail';

// Helper function to validate time
const validateTime = (time) => {
  return time >= 0 && time <= 2359;
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user's events (created by user)
// @route   GET /api/events/me/created
// @access  Private
export const getCurrentUserEvents = async (req, res) => {
  try {
    const events = await Event.find({ created_by: req.user_id })
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get photographer's events
// @route   GET /api/events/me/photographer
// @access  Private
export const getPhotographerEvents = async (req, res) => {
  try {
    const events = await Event.find({ photographer: req.user_id })
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    const {
      photographer,
      name,
      image,
      location,
      date,
      time_start,
      time_end,
      type,
      role,
      mature_content,
    } = req.body;

    // Validate time format
    if (!validateTime(time_start) || !validateTime(time_end)) {
      return res.status(400).json({
        success: false,
        message: 'Time must be in HHMM format (e.g., 1430 for 2:30 PM)',
      });
    }

    const event = await Event.create({
      created_by: req.user_id,
      photographer,
      name,
      image,
      location,
      date,
      time_start,
      time_end,
      type,
      role,
      mature_content,
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    res.status(201).json({
      success: true,
      data: populatedEvent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is event creator
    if (event.created_by.toString() !== req.user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event',
      });
    }

    // Validate time if provided
    if (req.body.time_start && !validateTime(req.body.time_start)) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in HHMM format',
      });
    }

    if (req.body.time_end && !validateTime(req.body.time_end)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be in HHMM format',
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    res.status(200).json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is event creator
    if (event.created_by.toString() !== req.user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event',
      });
    }

    await event.remove();

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

// @desc    Add recipients to event
// @route   POST /api/events/:id/recipients
// @access  Private
export const addRecipients = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is event creator
    if (event.created_by.toString() !== req.user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add recipients to this event',
      });
    }

    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        message: 'Recipients must be an array',
      });
    }

    // Process each recipient
    for (const recipient of recipients) {
      if (recipient.email) {
        // Send email invitation
        await sendEmail(
          recipient.email,
          'Event Invitation',
          `You've been invited to the event "${event.name}".\n\nEvent Date: ${event.date}\n\nPlease accept the invitation by clicking here: [Accept Link]`
        );

        // Add to recipients list if not already present
        if (!event.recipients.some((r) => r.email === recipient.email)) {
          event.recipients.push({ email: recipient.email });
        }
      } else if (recipient.id) {
        // Add user ID to recipients list if not already present
        if (
          !event.recipients.some(
            (r) => r.id && r.id.toString() === recipient.id
          )
        ) {
          event.recipients.push({ id: recipient.id });
        }
      }
    }

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture')
      .populate('recipients.id', 'name user_name email profile_picture');

    res.status(200).json({
      success: true,
      data: populatedEvent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Accept event invitation
// @route   PUT /api/events/:id/accept
// @access  Private
export const acceptInvite = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user was invited by email
    const user = await User.findById(req.user_id);
    const emailInvite = event.recipients.find((r) => r.email === user.email);

    // Check if user was invited by ID
    const idInvite = event.recipients.find(
      (r) => r.id && r.id.toString() === req.user_id
    );

    if (!emailInvite && !idInvite) {
      return res.status(403).json({
        success: false,
        message: 'You are not invited to this event',
      });
    }

    // If invited by email, replace with user ID
    if (emailInvite) {
      event.recipients = event.recipients.filter((r) => r.email !== user.email);
      event.recipients.push({ id: req.user_id });
    }

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture')
      .populate('recipients.id', 'name user_name email profile_picture');

    res.status(200).json({
      success: true,
      data: populatedEvent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Decline event invitation
// @route   PUT /api/events/:id/decline
// @access  Private
export const declineInvite = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const user = await User.findById(req.user_id);

    // Check if user was invited by email or ID
    const initialRecipientsCount = event.recipients.length;

    // Filter out the current user by email (if invited that way)
    event.recipients = event.recipients.filter((r) => r.email !== user.email);

    // Filter out the current user by ID (if invited that way)
    event.recipients = event.recipients.filter(
      (r) => !(r.id && r.id.toString() === req.user_id)
    );

    // If no recipient was removed, it means the user was not invited
    if (event.recipients.length === initialRecipientsCount) {
      return res.status(403).json({
        success: false,
        message:
          'You were not invited to this event, or have already declined/accepted.',
      });
    }

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture')
      .populate('recipients.id', 'name user_name email profile_picture');

    res.status(200).json({
      success: true,
      data: populatedEvent,
      message: 'Invitation declined successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Search events with filters
// @route   GET /api/events/search
// @access  Public
export const searchEvents = async (req, res) => {
  try {
    const { location, role, type, distance = 10 } = req.query;
    let query = {};

    // Location filter (within distance in km)
    if (location) {
      const [longitude, latitude] = location.split(',').map(Number);

      if (!isNaN(longitude) && !isNaN(latitude)) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: distance * 1000, // Convert km to meters
          },
        };
      }
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    const events = await Event.find(query)
      .populate('created_by', 'name user_name profile_picture')
      .populate('photographer', 'name user_name profile_picture');

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
