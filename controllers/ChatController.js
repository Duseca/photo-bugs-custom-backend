import Chat from '../models/Chat';
import User from '../models/User';
import Photo from '../models/Photo';
import Bundle from '../models/Bundle';

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

// @desc    Add message to chat
// @route   POST /api/chats/:id/messages
// @access  Private
export const addMessage = async (req, res) => {
  try {
    const { content, type, photoId, bundleId } = req.body;
    const chatId = req.params.id;
    const userId = req.user_id;

    // Validate chat exists and user is participant
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

    // Validate photo/bundle references
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

    // Create message
    const newMessage = {
      created_by: userId,
      type,
      content,
      photo: type === 'Photo' ? photoId : undefined,
      bundle: type === 'Bundle' ? bundleId : undefined,
      created_at: new Date(),
    };

    chat.messages.push(newMessage);
    await chat.save();

    // Populate references
    const populatedMessage = await populateMessage(newMessage);
    populatedMessage.created_by = await User.findById(userId).select(
      'name user_name profile_picture'
    );

    // Emit real-time event (see real-time section below)
    if (req.io) {
      req.io.to(chatId).emit('new_message', {
        chatId,
        message: populatedMessage,
      });
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
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
    const { content } = req.body;
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
        message: 'Not authorized to update this message',
      });
    }

    message.content = content || message.content;
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
