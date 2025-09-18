import Photo from '../models/Photo.js';
import User from '../models/User.js';
import Transaction from '../models/Transactions.js';
import { uploadImageWithWatermark } from '../utils/handleImages.js';
import { memoryUpload } from '../config/multer.js';
import { getGoogleAuthClient } from '../utils/googleClient.js';
import { google } from "googleapis";
import stream from "stream";
export const getCreatorImages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Photo.countDocuments({ created_by: req.user_id });

    const photos = await Photo.find({ created_by: req.user_id })
      .skip(skip)
      .limit(limit);

    res.json({
      count: photos.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: photos,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching photos', error: error.message });
  }
};
export const uploadImage = async (req, res) => {
  try {
    const user = await User.findById(req.user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    memoryUpload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          message: "File upload error",
          error: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      if (user.storage.used + req.file.size > user.storage.max) {
        return res.status(400).json({ message: "Insufficient storage space" });
      }

      try {
        // 🔹 Get Google OAuth client with refresh handling
        const oauth2Client = await getGoogleAuthClient(user);
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Convert buffer -> stream
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        // 🔹 Upload to Google Drive
        const response = await drive.files.create({
          requestBody: {
            name: req.file.originalname,
            mimeType: req.file.mimetype,
          },
          media: {
            mimeType: req.file.mimetype,
            body: bufferStream,
          },
          fields: "id, webViewLink, webContentLink",
        });

        // 🔹 Here you could apply watermarking separately if needed
        const originalUrl = response.data.webContentLink;
        const watermarkedUrl = response.data.webViewLink; // placeholder

        // Save DB record
        const photo = new Photo({
          created_by: req.user_id,
          link: originalUrl,
          watermarked_link: watermarkedUrl,
          price: req.body.price,
          size: req.file.size,
          metadata: req.body.metadata || {},
        });

        await photo.save();

        user.storage.used += req.file.size;
        await user.save();

        res.status(201).json(photo);
      } catch (error) {
        res.status(500).json({
          message: "Error uploading image to Google Drive",
          error: error.message,
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateImage = async (req, res) => {
  try {
    const photo = await Photo.findOne({
      _id: req.params.id,
      created_by: req.user_id,
    });

    if (!photo) {
      return res
        .status(404)
        .json({ message: 'Photo not found or unauthorized' });
    }

    if (req.body.price) photo.price = req.body.price;
    if (req.body.metadata) photo.metadata = req.body.metadata;

    await photo.save();
    res.json(photo);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating photo', error: error.message });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const photo = await Photo.findOneAndDelete({
      _id: req.params.id,
      created_by: req.user_id,
    });

    if (!photo) {
      return res
        .status(404)
        .json({ message: 'Photo not found or unauthorized' });
    }

    await deleteObjectsFromS3([photo.link, photo.watermarked_link]);

    await User.findByIdAndUpdate(req.user_id, {
      $inc: { 'storage.used': -photo.size },
    });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting photo', error: error.message });
  }
};

export const getImageById = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id).populate(
      'created_by ownership'
    );
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const isCreatorOrOwner =
      photo.created_by._id.equals(req.user_id) ||
      photo.ownership.some((owner) => owner._id.equals(req.user_id));

    const imageToReturn = isCreatorOrOwner
      ? photo.link
      : photo.watermarked_link;

    res.json({
      ...photo.toObject(),
      access_image: imageToReturn,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching photo', error: error.message });
  }
};

// @desc    Buy photo (initiate payment)
// @route   POST /api/photos/:id/buy
// @access  Private
// export const buyImage = async (req, res) => {
//   try {
//     const photo = await Photo.findById(req.params.id).populate('created_by');
//     if (!photo) {
//       return res.status(404).json({ message: 'Photo not found' });
//     }

//     const alreadyOwns = photo.ownership.includes(req.user_id);
//     if (alreadyOwns) {
//       return res.status(400).json({ message: 'You already own this photo' });
//     }

//     const platformFee = Math.round(photo.price * 0.15 * 100);
//     const photographerEarnings = Math.round(photo.price * 0.85 * 100);

//     const paymentIntent = await stripe(
//       process.env.STRIPE_SECRET_KEY
//     ).paymentIntents.create({
//       amount: photo.price * 100,
//       currency: 'usd',
//       payment_method_types: ['card'],
//       application_fee_amount: platformFee,
//       transfer_data: {
//         destination: photo.created_by.stripe_account_id,
//       },
//       metadata: {
//         buyer_id: req.user_id.toString(),
//         photo_id: photo._id.toString(),
//       },
//     });

//     const transaction = new Transaction({
//       seller: photo.created_by,
//       buyer: req.user_id,
//       type: 'Photo',
//       photo: photo._id,
//       amount: photo.price,
//       platform_fee: platformFee / 100,
//       photographer_earnings: photographerEarnings / 100,
//       stripe_payment_intent_id: paymentIntent.id,
//       status: 'pending',
//     });

//     await transaction.save();

//     res.json({
//       clientSecret: paymentIntent.client_secret,
//       transactionId: transaction._id,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: 'Error initiating purchase', error: error.message });
//   }
// };

// // @desc    Handle Stripe webhook
// // @route   POST /api/photos/webhook
// // @access  Public
// export const handleStripeWebhook = async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   if (event.type === 'payment_intent.succeeded') {
//     const paymentIntent = event.data.object;

//     try {
//       const transaction = await Transaction.findOneAndUpdate(
//         { stripe_payment_intent_id: paymentIntent.id },
//         { status: 'succeeded' },
//         { new: true }
//       ).populate('photo');

//       if (transaction) {
//         await Photo.findByIdAndUpdate(transaction.photo._id, {
//           $addToSet: { ownership: transaction.buyer },
//         });
//       }
//     } catch (error) {
//       console.error('Error processing webhook:', error);
//     }
//   }

//   res.json({ received: true });
// };
