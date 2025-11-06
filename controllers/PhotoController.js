import Photo from '../models/Photo.js';
import User from '../models/User.js';
import Transaction from '../models/Transactions.js';
import { uploadImageWithWatermark } from '../utils/handleImages.js';
import { memoryUpload } from '../config/multer.js';
import { google } from "googleapis";
import stream from "stream";
import { getGoogleAuthClient } from '../utils/googleClient.js';
import mongoose from 'mongoose';
import Folder from '../models/Folder.js';
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
        return res.status(400).json({
          message: "Insufficient storage space",
        });
      }
      if (
        !user.googleTokens ||
        !user.googleTokens.access_token ||
        !user.googleTokens.refresh_token
      ) {
        return res.status(401).json({
          message: "Google tokens missing. Please reauthenticate your account.",
        });
      }

      try {
        const oauth2Client = getGoogleAuthClient(
          user.googleTokens.access_token,
          user.googleTokens.refresh_token
        );
        if (
          user.googleTokens.expiry_date &&
          Date.now() > user.googleTokens.expiry_date
        ) {
          console.log("Access token expired, attempting refresh...");
          try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            user.googleTokens.access_token = credentials.access_token;
            if (credentials.expiry_date)
              user.googleTokens.expiry_date = credentials.expiry_date;
            await user.save();
            console.log("Access token refreshed successfully");
          } catch (refreshErr) {
            console.error("Failed to refresh token:", refreshErr);
            return res.status(401).json({
              message:
                "Google token refresh failed. Please sign in again to continue.",
            });
          }
        }
        oauth2Client.on("tokens", async (tokens) => {
          if (tokens.access_token) {
            user.googleTokens.access_token = tokens.access_token;
            if (tokens.expiry_date)
              user.googleTokens.expiry_date = tokens.expiry_date;
            await user.save();
          }
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

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

        const fileId = response.data.id;
        await drive.permissions.create({
          fileId,
          requestBody: { role: "reader", type: "anyone" },
        });

        const publicUrl = `https://drive.google.com/uc?id=${fileId}&export=view`;
        const parsedMetadata = (() => {
          try {
            return req.body.metadata ? JSON.parse(req.body.metadata) : {};
          } catch {
            return {};
          }
        })();

        const folderId = req.body.folder_id?.toString().trim();
        if (!mongoose.Types.ObjectId.isValid(folderId)) {
          return res.status(400).json({ message: "Invalid folder_id format" });
        }

        const folderExists = await Folder.findById(folderId);
        if (!folderExists) {
          return res.status(404).json({ message: "Folder not found" });
        }

        const price = Number(req.body.price);
        if (isNaN(price) || price < 0) {
          return res.status(400).json({ message: "Invalid price value" });
        }

        const photo = new Photo({
          created_by: req.user_id,
          link: publicUrl,
          watermarked_link: response.data.webViewLink,
          price,
          size: req.file.size,
          metadata: parsedMetadata,
          folder_id: folderId,
        });

        await photo.save();

        user.storage.used += req.file.size;
        await user.save();
        return res.status(201).json({
          success: true,
          message: "Image uploaded and made public successfully",
          data: photo,
        });
      } catch (error) {
        console.error("Google Drive upload error:", error);

        if (error.code === 401 || error.message.includes("Invalid Credentials")) {
          return res.status(401).json({
            message:
              "Google access expired or invalid. Please sign in again to continue.",
          });
        }

        return res.status(500).json({
          message: "Google upload failed.",
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
