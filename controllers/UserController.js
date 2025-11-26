import User from '../models/User.js';
import Token from '../models/Token.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import { generateRandomCode } from '../utils/helpers.js';
import { google } from 'googleapis';
export const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const verificationCode = generateRandomCode(6);

    // Store code temporarily
    await Token.findOneAndUpdate(
      { email },
      { code: verificationCode },
      { upsert: true, new: true }
    );

    await sendEmail(
      email,
      'Verify Your Email',
      `Your verification code is: ${verificationCode}`
    );

    res.status(200).json({
      success: true,
      message: 'Verification code sent to email',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      user_name,
      email,
      password,
      phone,
      device_token,
      role,
      profile_picture,
      socialProvider,
      socialId,
      access_token,
      refresh_token,
      expiry_date,
      serverAuthCode,
    } = req.body;

    if (socialProvider && serverAuthCode) {
      if (!socialId) {
        return res.status(400).json({
          success: false,
          message: "socialId is required for social login",
        });
      }


      let user = await User.findOne({ socialId, socialProvider });

      if (!user) {
        user = await User.create({
          name,
          user_name,
          email,
          phone,
          role,
          device_token,
          profile_picture,
          socialProvider,
          socialId,
          isVerified: true,
          googleTokens: access_token
            ? {
                access_token,
                refresh_token: refresh_token || undefined,
                expiry_date: expiry_date || undefined,
                serverAuthCode: serverAuthCode || undefined,
              }
            : undefined,
        });
      } else if (
        access_token ||
        refresh_token ||
        expiry_date ||
        serverAuthCode
      ) {
        user.googleTokens = {
          ...user.googleTokens?.toObject?.(),
          ...(access_token && { access_token }),
          ...(refresh_token && { refresh_token }),
          ...(expiry_date && { expiry_date }),
          ...(serverAuthCode && { serverAuthCode }),
        };
        await user.save();
      }

      const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET);
      const userResponse = user.toObject();
      delete userResponse.password;

      return res.status(201).json({
        success: true,
        data: { user: userResponse, token },
        message: "User registered via social login successfully",
      });
    }

    // ✅ Normal signup (email/password)
    const tokenRecord = await Token.findOne({ email });
    if (!tokenRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    const user = await User.create({
      name,
      user_name,
      email,
      password,
      phone,
      role,
      device_token,
      profile_picture,
      isVerified: true,
      googleTokens: access_token
        ? {
            access_token,
            refresh_token: refresh_token || undefined,
            expiry_date: expiry_date || undefined,
            serverAuthCode: serverAuthCode || undefined,
          }
        : undefined,
    });

    await Token.deleteOne({ email });

    const jwtToken = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET);
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: { user: userResponse, token: jwtToken },
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password, socialProvider, socialId } = req.body;

    let user;

    // Social login
    if (socialProvider && socialId) {
      user = await User.findOne({ socialId, socialProvider });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found. Please sign up first with social login.',
        });
      }
    } else {
      // Normal login
      user = await User.findOne({ email });
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
    }

    const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET);
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: { user: userResponse, token },
      message: 'User logged in successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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
export const getAllUsers = async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId) {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();

    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (updates.email || updates.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot update email or password from this endpoint",
      });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (
      updates.accessToken ||
      updates.refresh_token ||
      updates.expires_in ||
      updates.serverAuthCode
    ) {
      currentUser.googleTokens = {
        ...currentUser.googleTokens?.toObject?.(),
        ...(updates.accessToken && { access_token: updates.accessToken }),
        ...(updates.refresh_token && { refresh_token: updates.refresh_token }),
        ...(updates.serverAuthCode && { serverAuthCode: updates.serverAuthCode }),
        ...(updates.expires_in && {
          expiry_date: Date.now() + updates.expires_in * 1000,
        }),
      };

      // Remove token fields from the main updates
      delete updates.accessToken;
      delete updates.refresh_token;
      delete updates.expires_in;
      delete updates.serverAuthCode;
    }

    // ✅ Handle nested fields (address, settings, location)
    const nestedFields = ["address", "settings", "location"];
    nestedFields.forEach((field) => {
      if (updates[field]) {
        updates[field] = {
          ...(currentUser[field]?.toObject?.() || {}),
          ...updates[field],
        };
      }
    });

    // ✅ Merge remaining updates
    Object.assign(currentUser, updates);

    const updatedUser = await currentUser.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: userResponse,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("updateUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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
export const searchCreators = async (req, res) => {
  try {
    const { name, email, bio, interests, gender, country, town } = req.query;

    // Base query: only creators
    const query = { role: "creator" };

    // Dynamic filtering based on provided query params
    if (name) {
      const regex = new RegExp(name, "i");
      query.$or = [
        { name: regex },
        { user_name: regex },
        { bio: regex },
      ];
    }

    if (email) {
      query.email = new RegExp(email, "i");
    }

    if (bio) {
      query.bio = new RegExp(bio, "i");
    }

    if (interests) {
      // Support multiple interests separated by commas
      const interestArray = interests.split(",").map((i) => i.trim());
      query.interests = { $in: interestArray };
    }

    if (gender) {
      query.gender = gender;
    }

    if (country) {
      query["address.country"] = new RegExp(country, "i");
    }

    if (town) {
      query["address.town"] = new RegExp(town, "i");
    }

    // Perform search
    const creators = await User.find(query).select(
      "name user_name email bio interests profile_picture gender address"
    );

    res.status(200).json({
      count: creators.length,
      results: creators,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
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
export const generateGoogleTokens = async (req, res) => {
  try {
    const { serverAuthCode, email } = req.body; 

    if (!serverAuthCode) {
      return res.status(400).json({ message: "serverAuthCode required" });
    }

    const oauth2Client = new google.auth.OAuth2(
      "475571616343-2kfdvc5eqknjs0p9s8pf9dbgrmpu3s1q.apps.googleusercontent.com",
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    //https://developers.google.com/oauthplayground , https://photosbybugs.com
    const { tokens } = await oauth2Client.getToken(serverAuthCode);
    if (!tokens) {
      return res.status(400).json({ message: "Failed to get Google tokens" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.googleTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      serverAuthCode,
    };
     
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Google tokens generated and saved successfully",
      tokens,
    });
  } catch (error) {
    console.error("Error generating Google tokens:", error);
    res.status(500).json({
      message: "Failed to generate Google tokens",
      error: error.message,
    });
  }
};
