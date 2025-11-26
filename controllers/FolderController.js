import { google } from 'googleapis';
import Folder from '../models/Folder.js';
import Photo from '../models/Photo.js';
import PhotoBundle from '../models/PhotoBundle.js';
import User from '../models/User.js';
import { getGoogleAuthClient } from '../utils/googleClient.js';
import Event from '../models/Event.js';
export const createFolder = async (req, res) => {
  try {
    const { name, event_id, recipients = [] } = req.body;

    const user = await User.findById(req.user_id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (
      !user.googleTokens?.access_token ||
      !user.googleTokens?.refresh_token
    ) {
      return res.status(401).json({
        message: "Google authentication missing. Please reauthenticate.",
      });
    }
    const oauth2Client = getGoogleAuthClient(
      user.googleTokens.access_token,
      user.googleTokens.refresh_token
    );

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const event = await Event.findById(event_id);
    if (!event)
      return res.status(404).json({ message: "Event not found" });

    const eventName = event.title || event.name || "Event";
    let eventFolderId = event.drive_folder_id;

    if (!eventFolderId) {
    
      const eventFolder = await drive.files.create({
        requestBody: {
          name: eventName,
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });

      eventFolderId = eventFolder.data.id;
      event.drive_folder_id = eventFolderId;
      await event.save();
    }
    const folderCreate = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [eventFolderId],
      },
      fields: "id",
    });

    const subFolderId = folderCreate.data.id;
    const folder = new Folder({
      name,
      event_id,
      created_by: req.user_id,
      recipients,
      drive_folder_id: subFolderId,
      event_drive_folder_id: eventFolderId,
    });

    await folder.save();

    return res.status(201).json({
      message: "Folder created successfully",
      folder,
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return res.status(500).json({
      message: "Error creating folder",
      error: error.message,
    });
  }
};
export const getFoldersByEvent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Folder.countDocuments({
      event_id: req.params.eventId,
      $or: [
        { created_by: req.user_id },
        { 'recipients.id': req.user_id, 'recipients.status': 'accepted' },
      ],
    });

    const folders = await Folder.find({
      event_id: req.params.eventId,
      $or: [
        { created_by: req.user_id },
        { 'recipients.id': req.user_id, 'recipients.status': 'accepted' },
      ],
    })
      .populate('created_by', 'name email profile_picture')
      .skip(skip)
      .limit(limit);

    res.json({
      count: folders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: folders,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching folders', error: error.message });
  }
};
export const getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      $or: [
        { created_by: req.user_id },
        { 'recipients.id': req.user_id, 'recipients.status': 'accepted' },
      ],
    }).populate('created_by', 'name email profile_picture');
    // .populate('cover_photo', 'link watermarked_link');

    if (!folder) {
      return res
        .status(404)
        .json({ message: 'Folder not found or access denied' });
    }

    // Get photos with access control
    const photos = await Photo.find({ _id: { $in: folder.photos } }).populate(
      'created_by',
      'name email profile_picture'
    );

    // Get bundles with access control
    const bundles = await PhotoBundle.find({
      _id: { $in: folder.bundles },
    }).populate('created_by', 'name email profile_picture');
    // Apply access control to photos
    const photosWithAccess = photos.map((photo) => {
      const canViewOriginal =
        photo.created_by._id.equals(req.user_id) ||
        photo.ownership.includes(req.user_id);
      return {
        ...photo.toObject(),
        access_image: canViewOriginal ? photo.link : photo.watermarked_link,
      };
    });

    res.json({
      ...folder.toObject(),
      photos: photosWithAccess,
      bundles,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching folder', error: error.message });
  }
};
export const getAllFolders = async (req, res) => {
  try {
    // 1. Get ALL folders
    const folders = await Folder.find()
      .populate("created_by", "name email profile_picture");

    if (!folders || folders.length === 0) {
      return res.status(404).json({ message: "No folders found" });
    }

    // 2. Build final array
    const finalFolders = [];

    for (const folder of folders) {
      // ---- PHOTOS ----
      const photos = await Photo.find({ _id: { $in: folder.photos } })
        .populate("created_by", "name email profile_picture");

      // Apply access control
      const photosWithAccess = photos.map(photo => {
        const canViewOriginal =
          photo.created_by._id.equals(req.user_id) ||
          photo.ownership.includes(req.user_id);

        return {
          ...photo.toObject(),
          access_image: canViewOriginal ? photo.link : photo.watermarked_link
        };
      });

      // ---- BUNDLES ----
      const bundles = await PhotoBundle.find({
        _id: { $in: folder.bundles }
      }).populate("created_by", "name email profile_picture");

      // Push merged result
      finalFolders.push({
        ...folder.toObject(),
        photos: photosWithAccess,
        bundles
      });
    }

    res.json(finalFolders);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching folders",
      error: error.message
    });
  }
};
export const acceptInvite = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    const user = await User.findById(req.user_id);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Check if user was invited
    const invite = folder.recipients.find(
      (r) =>
        (r.email && r.email === user.email) ||
        (r.id && r.id.toString() === req.user_id)
    );

    if (!invite) {
      return res
        .status(403)
        .json({ message: 'You are not invited to this folder' });
    }

    // Update invitation status
    await Folder.updateOne(
      { _id: req.params.id, 'recipients._id': invite._id },
      { $set: { 'recipients.$.status': 'accepted' } }
    );

    const updatedFolder = await Folder.findById(req.params.id)
      .populate('created_by', 'name email profile_picture')
      .populate('recipients.id', 'name email profile_picture');

    res.json(updatedFolder);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error accepting invitation', error: error.message });
  }
};
export const declineInvite = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    const user = await User.findById(req.user_id);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Check if user was invited
    const invite = folder.recipients.find(
      (r) =>
        (r.email && r.email === user.email) ||
        (r.id && r.id.toString() === req.user_id)
    );

    if (!invite) {
      return res
        .status(403)
        .json({ message: 'You are not invited to this folder' });
    }

    // Update invitation status
    await Folder.updateOne(
      { _id: req.params.id, 'recipients._id': invite._id },
      { $set: { 'recipients.$.status': 'declined' } }
    );

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error declining invitation', error: error.message });
  }
};
