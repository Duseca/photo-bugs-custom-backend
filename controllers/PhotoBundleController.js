import PhotoBundle from '../models/PhotoBundle.js';
import Photo from '../models/Photo.js';
import Transaction from '../models/Transaction.js';

// @desc    Create a new photo bundle
// @route   POST /api/photo-bundles
// @access  Private
export const createPhotoBundle = async (req, res) => {
  try {
    const {
      name,
      price,
      folder_id,
      photo_ids = [],
      bonus_photo_ids = [],
    } = req.body;

    const photoCount = await Photo.countDocuments({
      _id: { $in: [...photo_ids, ...bonus_photo_ids] },
      created_by: req.user_id,
    });

    if (photoCount !== photo_ids.length + bonus_photo_ids.length) {
      return res
        .status(400)
        .json({ message: 'Some photos not found or unauthorized' });
    }

    const photoBundle = await PhotoBundle.create({
      created_by: req.user_id,
      folder_id,
      name,
      photos: photo_ids,
      bonus_photos: bonus_photo_ids,
      price,
      cover_photo: photo_ids[0] || bonus_photo_ids[0] || null,
    });

    res
      .status(201)
      .json(await photoBundle.populate('photos bonus_photos cover_photo'));
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error creating bundle', error: error.message });
  }
};

// @desc    Get all bundles in a folder
// @route   GET /api/photo-bundles/folder/:folderId
// @access  Private
export const getBundlesByFolder = async (req, res) => {
  try {
    const bundles = await PhotoBundle.find({
      folder_id: req.params.folderId,
      $or: [{ created_by: req.user_id }, { ownership: req.user_id }],
    }).populate('photos bonus_photos cover_photo');

    res.json(bundles);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching bundles', error: error.message });
  }
};

// @desc    Get bundle details
// @route   GET /api/photo-bundles/:id
// @access  Private
export const getBundle = async (req, res) => {
  try {
    const bundle = await PhotoBundle.findOne({
      _id: req.params.id,
      $or: [{ created_by: req.user_id }, { ownership: req.user_id }],
    }).populate('photos bonus_photos cover_photo');

    if (!bundle) {
      const exists = await PhotoBundle.exists({ _id: req.params.id });
      return exists
        ? res
            .status(403)
            .json({ message: 'Purchase required to access this bundle' })
        : res.status(404).json({ message: 'Bundle not found' });
    }

    res.json(bundle);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching bundle', error: error.message });
  }
};

// @desc    Update a photo bundle
// @route   PUT /api/photo-bundles/:id
// @access  Private (creator only)
export const updateBundle = async (req, res) => {
  try {
    const { name, price, photo_ids, bonus_photo_ids, cover_photo_id } =
      req.body;

    const update = {};
    if (name) update.name = name;
    if (price) update.price = price;
    if (cover_photo_id) update.cover_photo = cover_photo_id;

    if (photo_ids || bonus_photo_ids) {
      const photosToVerify = [...(photo_ids || []), ...(bonus_photo_ids || [])];

      const photoCount = await Photo.countDocuments({
        _id: { $in: photosToVerify },
        created_by: req.user_id,
      });

      if (photoCount !== photosToVerify.length) {
        return res
          .status(400)
          .json({ message: 'Some photos not found or unauthorized' });
      }

      if (photo_ids) update.photos = photo_ids;
      if (bonus_photo_ids) update.bonus_photos = bonus_photo_ids;
    }

    const updatedBundle = await PhotoBundle.findOneAndUpdate(
      { _id: req.params.id, created_by: req.user_id },
      update,
      { new: true, runValidators: true }
    ).populate('photos bonus_photos cover_photo');

    if (!updatedBundle) {
      return res
        .status(404)
        .json({ message: 'Bundle not found or unauthorized' });
    }

    res.json(updatedBundle);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating bundle', error: error.message });
  }
};

// @desc    Delete a photo bundle
// @route   DELETE /api/photo-bundles/:id
// @access  Private (creator only)
export const deleteBundle = async (req, res) => {
  try {
    const deletedBundle = await PhotoBundle.findOneAndDelete({
      _id: req.params.id,
      created_by: req.user_id,
    });

    if (!deletedBundle) {
      return res
        .status(404)
        .json({ message: 'Bundle not found or unauthorized' });
    }

    res.json({ message: 'Bundle deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting bundle', error: error.message });
  }
};

// @desc    Purchase a photo bundle
// @route   POST /api/photo-bundles/:id/purchase
// @access  Private
export const purchaseBundle = async (req, res) => {
  try {
    const bundle = await PhotoBundle.findById(req.params.id);
    if (!bundle) {
      return res.status(404).json({ message: 'Bundle not found' });
    }

    if (bundle.ownership.includes(req.user_id)) {
      return res.status(400).json({ message: 'You already own this bundle' });
    }

    // Process payment here (Stripe integration would go here)
    // After successful payment:
    // bundle.ownership.push(req.user_id);
    // await bundle.save();

    //     const platformFee = Math.round(bundle.price * 0.15 * 100);
    //     const photographerEarnings = Math.round(bundle.price * 0.85 * 100);

    //     const paymentIntent = await stripe(
    //       process.env.STRIPE_SECRET_KEY
    //     ).paymentIntents.create({
    //       amount: bundle.price * 100,
    //       currency: 'usd',
    //       payment_method_types: ['card'],
    //       application_fee_amount: platformFee,
    //       transfer_data: {
    //         destination: bundle.created_by.stripe_account_id,
    //       },
    //       metadata: {
    //         buyer_id: req.user_id.toString(),
    //         bundle_id: bundle._id.toString(),
    //       },
    //     });

    //     const transaction = new Transaction({
    //       buyer: photo.created_by,
    //       buyer: req.user_id,
    //       type: 'Bundle',
    //       bundle: bundle._id,
    //       amount: bundle.price,
    //       platform_fee: platformFee / 100,
    //       photographer_earnings: photographerEarnings / 100,
    //       stripe_payment_intent_id: paymentIntent.id,
    //       status: 'pending',
    //     });

    //     await transaction.save();

    res.json({
      message: 'Bundle purchased successfully',
      bundle: await bundle.populate('photos bonus_photos cover_photo'),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error purchasing bundle', error: error.message });
  }
};

// // @desc    Handle Stripe webhook
// // @route   POST /api/photo-bundles/webhook
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
//       ).populate('bundle');

//       if (transaction) {
//         await PhotoBundle.findByIdAndUpdate(transaction.bundle._id, {
//           $addToSet: { ownership: transaction.buyer },
//         });
//       }
//     } catch (error) {
//       console.error('Error processing webhook:', error);
//     }
//   }

//   res.json({ received: true });
// };
