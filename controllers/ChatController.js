import Chat from '../models/Chat.js';
import User from '../models/User.js';
// import Photo from '../models/Photo.js';
// import Bundle from '../models/Bundle.js';

// Helper to populate message references
const populateMessage = (message) => {
  let populated = message;
  if (message.type === 'Photo' && message.photo) {
    populated.photo = Photo.findById(message.photo);
  }
  if (message.type === 'Bundle' && message.bundle) {
    populated.bundle = Bundle.findById(message.bundle);
  }
  return populated;
};

// @desc    Create new chat
// @route   POST /api/chats
// @access  Private
export const createChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user_id;

    // Check if chat already exists between these users
    const existingChat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
    });

    if (existingChat) {
      return res.status(200).json({
        success: true,
        data: existingChat,
      });
    }

    const chat = await Chat.create({
      participants: [userId, participantId],
      lastSeen: [
        { user: userId, timestamp: new Date() },
        { user: participantId, timestamp: new Date(0) }, // Set to epoch if not seen
      ],
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name user_name profile_picture')
      .populate('lastSeen.user', 'name user_name');

    res.status(201).json({
      success: true,
      data: populatedChat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get user's chats
// @route   GET /api/chats
// @access  Private
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user_id })
      .populate('participants', 'name user_name profile_picture')
      .populate('lastSeen.user', 'name user_name')
      .sort({ updatedAt: -1 });

    // Calculate unread counts for each chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const userLastSeen = chat.lastSeen.find(
          (ls) => ls.user._id.toString() === req.user_id.toString()
        );
        const lastSeenTime = userLastSeen
          ? userLastSeen.timestamp
          : new Date(0);

        const unreadCount = chat.messages.filter(
          (msg) =>
            msg.created_at > lastSeenTime &&
            msg.created_by.toString() !== req.user_id.toString()
        ).length;

        return {
          ...chat.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: chatsWithUnread.length,
      data: chatsWithUnread,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Find chat by ID and populate relevant fields
    const chat = await Chat.findById(chatId)
      .populate('participants', 'name user_name profile_picture')
      .populate('lastSeen.user', 'name user_name');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const userLastSeen = chat.lastSeen.find(
      (ls) => ls.user._id.toString() === req.user_id.toString()
    );

    const lastSeenTime = userLastSeen ? userLastSeen.timestamp : new Date(0);

    const unreadCount = chat.messages.filter(
      (msg) =>
        msg.created_at > lastSeenTime &&
        msg.created_by.toString() !== req.user_id.toString()
    ).length;

    res.status(200).json({
      success: true,
      data: {
        ...chat.toObject(),
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add message to chat
// @route   POST /api/chats/:id/messages
// @access  Private
export const addMessage = async (req, res) => {
  try {
    const { content, type, photoId, bundleId } = req.body;
    const chatId = req.params.id;
    const userId = req.user_id;

    // Check chat existence and participation
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or not authorized',
      });
    }

    // Validate message type requirements
    if (type === 'Photo' && !photoId) {
      return res.status(400).json({
        success: false,
        message: 'Photo ID required for photo messages',
      });
    }

    if (type === 'Bundle' && !bundleId) {
      return res.status(400).json({
        success: false,
        message: 'Bundle ID required for bundle messages',
      });
    }

    // Create new message object
    const newMessage = {
      created_by: userId,
      type,
      content,
      photo: type === 'Photo' ? photoId : undefined,
      bundle: type === 'Bundle' ? bundleId : undefined,
      created_at: new Date(),
    };

    // Push message into chat
    chat.messages.push(newMessage);
    await chat.save();

    // Get the last inserted message (exactly how it’s stored)
    const storedMessage = chat.messages[chat.messages.length - 1];

    // Get user details
    const user = await User.findById(userId).select('name user_name profile_picture email');

    // Build detailed response (no populate helper)
    const detailedMessage = {
      ...storedMessage.toObject(),
      created_by: user,
      chat: {
        _id: chat._id,
        participants: chat.participants,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      },
    };

    // Real-time broadcast (optional)
    if (req.io) {
      req.io.to(chatId).emit('new_message', {
        chatId,
        message: detailedMessage,
      });
    }

    // Send full message with chat + user data
    res.status(201).json({
      success: true,
      data: detailedMessage,
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update message
// @route   PUT /api/chats/:chatId/messages/:messageId
// @access  Private
export const updateMessage = async (req, res) => {
  try {
    const { content, markAsRead, chatId } = req.body;
    const {  messageId } = req.params;
    const userId = req.user_id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or not authorized',
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // 🧩 Update content (only for creator)
    if (content) {
      if (message.created_by.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit this message',
        });
      }
      message.content = content;
    }

    // 🧩 Mark as read (any participant can do this)
    if (markAsRead) {
      message.isRead = true; // ✅ set the flag

      // also update user's lastSeen timestamp
      const userLastSeen = chat.lastSeen.find(
        (ls) => ls.user.toString() === userId.toString()
      );

      if (userLastSeen) {
        userLastSeen.timestamp = new Date();
      } else {
        chat.lastSeen.push({ user: userId, timestamp: new Date() });
      }
    }

    await chat.save();

    const populatedMessage = await populateMessage(message.toObject());
    populatedMessage.created_by = await User.findById(userId).select(
      'name user_name profile_picture'
    );

    res.status(200).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Delete message
// @route   DELETE /api/chats/:chatId/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user_id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or not authorized',
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user is the message creator
    if (message.created_by.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message',
      });
    }

    chat.messages.pull(messageId);
    await chat.save();

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

// @desc    Update last seen timestamp
// @route   PUT /api/chats/:id/last-seen
// @access  Private
export const updateLastSeen = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      participants: req.user_id,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or not authorized',
      });
    }

    // Update last seen timestamp
    const now = new Date();
    const lastSeenIndex = chat.lastSeen.findIndex(
      (ls) => ls.user.toString() === req.user_id.toString()
    );

    if (lastSeenIndex >= 0) {
      chat.lastSeen[lastSeenIndex].timestamp = now;
    } else {
      chat.lastSeen.push({ user: req.user_id, timestamp: now });
    }

    await chat.save();

    res.status(200).json({
      success: true,
      data: { timestamp: now },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
