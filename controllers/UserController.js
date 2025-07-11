import User from '../models/User.js';
import Token from '../models/Token.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import { generateRandomCode } from '../utils/helpers.js';
// import stripe from '../config/stripeConnect.js';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, user_name, email, password, phone, device_token } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create new user
    const user = await User.create({
      name,
      user_name,
      email,
      password,
      phone,
      device_token,
      profile_picture: req.body.profile_picture,
      storage: {
        max: 250 * 1024 * 1024,
        used: 0,
      },
    });

    const verificationCode = generateRandomCode(6);
    await Token.create({
      email: user.email,
      code: verificationCode,
    });

    await sendEmail(
      user.email,
      'Verify Your Email',
      `Your verification code is: ${verificationCode}`
    );

    const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
      message: 'User registered successfully. Please verify your email.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
      });
    }

    const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
      message: 'User logged in successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user_id)
      .select('-password -__v') // Exclude password and version key
      .populate({
        path: 'favourites',
        select: 'name user_name profile_picture', // Only include these fields from favourites
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const userObject = user.toObject();

    // Add readable storage formats
    userObject.storage = {
      ...userObject.storage,
      maxReadable: formatBytes(userObject.storage.max),
      usedReadable: formatBytes(userObject.storage.used),
      available: userObject.storage.max - userObject.storage.used,
      availableReadable: formatBytes(
        userObject.storage.max - userObject.storage.used
      ),
    };

    res.status(200).json({
      success: true,
      data: userObject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/update
// @access  Private
export const updateUser = async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user_id;

    if (updates.email || updates.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update email or password with this endpoint',
      });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const nestedFields = ['address', 'settings', 'location'];
    nestedFields.forEach((field) => {
      if (updates[field]) {
        updates[field] = {
          ...currentUser[field].toObject(), // Keep existing values
          ...updates[field], // Apply updates
        };
      }
    });

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: userResponse,
      message: 'User updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user password
// @route   PUT /api/users/update-password
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user_id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add user to favorites
// @route   POST /api/users/favorites/:userId
// @access  Private
export const addFavourite = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user_id;

    // Check if user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already in favorites
    const currentUser = await User.findById(currentUserId);
    if (currentUser.favourites.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User already in favorites',
      });
    }

    // Add to favorites
    await User.findByIdAndUpdate(currentUserId, {
      $push: { favourites: userId },
    });

    res.status(200).json({
      success: true,
      message: 'User added to favorites successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove user from favorites
// @route   DELETE /api/users/favorites/:userId
// @access  Private
export const removeFavourite = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user_id;

    // Check if user exists
    const userToRemove = await User.findById(userId);
    if (!userToRemove) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if in favorites
    const currentUser = await User.findById(currentUserId);
    if (!currentUser.favourites.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User not in favorites',
      });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { favourites: userId },
    });

    res.status(200).json({
      success: true,
      message: 'User removed from favorites successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify user email
// @route   POST /api/users/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const token = await Token.findOne({ email, code });
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code or email',
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    await Token.deleteOne({ _id: token._id });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Purchase additional storage
// @route   POST /api/users/purchase-storage
// @access  Private
export const purchaseStorage = async (req, res) => {
  try {
    const userId = req.user_id;
    const { gigabytes } = req.body;

    if (!gigabytes || isNaN(gigabytes) || gigabytes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid number of gigabytes to purchase',
      });
    }

    const bytesToAdd = gigabytes * 1024 * 1024 * 1024;
    const amountPaid = gigabytes * 1; // $1 per GB (for future payment integration)

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { 'storage.max': bytesToAdd },
        $push: {
          storagePurchases: {
            bytes: bytesToAdd,
            amountPaid: amountPaid,
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        storage: {
          max: user.storage.max,
          maxReadable: formatBytes(user.storage.max),
          used: user.storage.used,
          usedReadable: formatBytes(user.storage.used),
          available: user.storage.max - user.storage.used,
          availableReadable: formatBytes(user.storage.max - user.storage.used),
        },
        purchased: formatBytes(bytesToAdd),
        gigabytesPurchased: gigabytes,
      },
      message: `Successfully purchased ${gigabytes}GB of storage`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get storage information
// @route   GET /api/users/storage
// @access  Private
export const getStorageInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user_id).select(
      'storage storagePurchases'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        storage: {
          max: user.storage.max,
          maxReadable: formatBytes(user.storage.max),
          used: user.storage.used,
          usedReadable: formatBytes(user.storage.used),
          available: user.storage.max - user.storage.used,
          availableReadable: formatBytes(user.storage.max - user.storage.used),
        },
        purchases: user.storagePurchases.map((purchase) => ({
          bytes: purchase.bytes,
          amountPaid: purchase.amountPaid,
          date: purchase.date,
          readable: formatBytes(purchase.bytes),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const startStripeOnboarding = async (req, res) => {
//   try {
//     const user = await User.findById(req.user_id);

//     if (user.stripe_account_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'User already has a Stripe account',
//       });
//     }

//     const account = await stripe.accounts.create({
//       type: 'standard',
//       email: user.email,
//       business_type: 'individual',
//       individual: {
//         email: user.email,
//         first_name: user.name.split(' ')[0],
//         last_name: user.name.split(' ')[1] || '',
//         phone: user.phone,
//       },
//       metadata: {
//         userId: user._id.toString(),
//       },
//       capabilities: {
//         card_payments: { requested: true },
//         transfers: { requested: true },
//       },
//     });

//     const accountLink = await stripe.accountLinks.create({
//       account: account.id,
//       refresh_url: `${process.env.BASE_URL}/stripe/onboard/retry`,
//       return_url: `${process.env.BASE_URL}/stripe/onboard/success`,
//       type: 'account_onboarding',
//       collect: 'eventually_due',
//     });

//     user.stripe_account_id = account.id;
//     await user.save();

//     res.json({
//       success: true,
//       url: accountLink.url,
//     });
//   } catch (error) {
//     console.error('Stripe onboarding error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to start Stripe onboarding',
//       error: error.message,
//     });
//   }
// };

// export const checkStripeAccountStatus = async (req, res) => {
//   try {
//     const user = await User.findById(req.user_id);

//     if (!user.stripe_account_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'No Stripe account found for user',
//       });
//     }

//     const account = await stripe.accounts.retrieve(user.stripe_account_id);

//     res.json({
//       success: true,
//       accountStatus: account,
//       onboardingComplete: account.details_submitted,
//       payoutsEnabled: account.payouts_enabled,
//       chargesEnabled: account.charges_enabled,
//     });
//   } catch (error) {
//     console.error('Stripe account status error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to check Stripe account status',
//       error: error.message,
//     });
//   }
// };

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]);
};
