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
    if (!user) return res.status(404).json({ message: "User not found" });

    memoryUpload(req, res, async (err) => {
      if (err) return res.status(400).json({ message: "File upload error", error: err.message });
      if (!req.file) return res.status(400).json({ message: "No image uploaded" });
      if (user.storage.used + req.file.size > user.storage.max) {
        return res.status(400).json({ message: "Insufficient storage space" });
      }

      try {
        const oauth2Client = await getGoogleAuthClient(user);
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        // Upload file to Google Drive
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

        const originalUrl = response.data.webContentLink;
        const watermarkedUrl = response.data.webViewLink;

        // Save photo record in DB
        const photo = new Photo({
          created_by: req.user_id,
          link: originalUrl,
          watermarked_link: watermarkedUrl,
          price: req.body.price,
          size: req.file.size,
          metadata: req.body.metadata || {},
        });
        await photo.save();

        // Update user storage usage
        user.storage.used += req.file.size;
        await user.save();

        res.status(201).json(photo);
      } catch (error) {
        console.error("Google Drive upload error:", error);
        res.status(401).json({
          message: "Google authentication failed. Please re-link your Google account.",
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
    const photo = await Photo.findById(req.params.id).populate('created_by ownership');
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const isCreatorOrOwner =
      photo.created_by._id.equals(req.user_id) ||
      photo.ownership.some((owner) => owner._id.equals(req.user_id));

    // Increment view count only for public viewers
    if (!isCreatorOrOwner) {
      photo.views += 1;
      photo.lastViewedAt = new Date();
      await photo.save();
    }

    const imageToReturn = isCreatorOrOwner
      ? photo.link
      : photo.watermarked_link;

    res.json({
      ...photo.toObject(),
      access_image: imageToReturn,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching photo', error: error.message });
  }
};
export const getAllPhotos = async (req, res) => {
  try {
    const photos = await Photo.find()
      .populate('created_by ownership')
      .sort({ createdAt: -1 }); 

    if (!photos || photos.length === 0) {
      return res.status(200).json({ message: 'No photos found', data: [] });
    }

    const photosWithAccess = photos.map((photo) => {
      const isCreatorOrOwner =
        photo.created_by._id.equals(req.user_id) ||
        photo.ownership.some((owner) => owner._id.equals(req.user_id));

      const imageToReturn = isCreatorOrOwner
        ? photo.link
        : photo.watermarked_link;

      return {
        ...photo.toObject(),
        access_image: imageToReturn,
      };
    });

    res.status(200).json({
      totalPhotos: photosWithAccess.length,
      data: photosWithAccess,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching photos',
      error: error.message,
    });
  }
};
export const searchPhotos = async (req, res) => {
  try {
    const {
      created_by,
      ownership,
      link,
      watermarked_link,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      metadataKey,
      metadataValue,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      page = 1,
    } = req.query;

    const query = {};
    if (created_by) query.created_by = created_by;
    if (ownership) query.ownership = ownership;
    if (link)
      query.link = { $regex: link, $options: 'i' };
    if (watermarked_link)
      query.watermarked_link = { $regex: watermarked_link, $options: 'i' };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (metadataKey && metadataValue) {
      query[`metadata.${metadataKey}`] = { $regex: metadataValue, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const photos = await Photo.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('created_by ownership');

    const total = await Photo.countDocuments(query);

    res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      results: photos,
    });
  } catch (error) {
    console.error('Error searching photos:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
export const getTrendingPhotos = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const photos = await Photo.find()
      .sort({ views: -1 }) 
      .limit(limit)
      .populate('created_by', 'name avatar'); 

    res.status(200).json({
      message: 'Trending photos fetched successfully',
      total: photos.length,
      results: photos,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trending photos', error: error.message });
  }
};
