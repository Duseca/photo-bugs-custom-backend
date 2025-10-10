import Download from "../models/Download.js";
import Photo from "../models/Photo.js";

export const trackDownload = async (req, res) => {
  try {
    const { photoId } = req.params; 
    const userId = req.user_id;
    const photo = await Photo.findById(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });
    const alreadyDownloaded = await Download.findOne({ photo: photoId, downloaded_by: userId });
    if (alreadyDownloaded) {
      return res.status(200).json({ message: "Download already tracked" });
    }

    const download = new Download({
      photo: photoId,
      downloaded_by: userId,
    });
    await download.save();

    res.status(201).json({
      message: "Download tracked successfully",
      data: download,
    });
  } catch (error) {
    console.error("Error tracking download:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const getCreatorDownloadStats = async (req, res) => {
  try {
    const creatorId = req.user_id;
    const photos = await Photo.find({ created_by: creatorId }, "_id");
    const photoIds = photos.map((p) => p._id);

    if (photoIds.length === 0) {
      return res.status(200).json({
        totalDownloads: 0,
        monthlyStats: Array.from({ length: 12 }, (_, i) => ({
          year: new Date().getFullYear(),
          month: i + 1,
          downloads: 0,
        })),
      });
    }

    // Aggregate actual stats
    const stats = await Download.aggregate([
      { $match: { photo: { $in: photoIds } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Convert stats to map for quick lookup
    const statMap = new Map();
    stats.forEach((s) => {
      const key = `${s._id.year}-${s._id.month}`;
      statMap.set(key, s.count);
    });

    const currentYear = new Date().getFullYear();
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const key = `${currentYear}-${month}`;
      return {
        year: currentYear,
        month,
        downloads: statMap.get(key) || 0,
      };
    });

    const totalDownloads = monthlyStats.reduce((acc, curr) => acc + curr.downloads, 0);

    res.status(200).json({
      totalDownloads,
      monthlyStats,
    });
  } catch (error) {
    console.error("Error fetching download stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
