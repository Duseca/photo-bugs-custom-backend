import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";

export const createPortfolio = async (req, res) => {
  try {
    console.log(req.body)
    const { media } = req.body;
    const creatorId = req.user_id; 

    const user = await User.findById(creatorId);
    if (!user || user.role !== "creator") {
      return res.status(403).json({ message: "Only creators can create portfolios" });
    }

    if (!Array.isArray(media) || media.some(m => !Array.isArray(m.url) || m.url.length === 0)) {
    return res.status(400).json({ message: "Each media item must include at least one URL." });
  }

    const portfolio = await Portfolio.create({ creator: creatorId, media });
    res.status(201).json({ message: "Portfolio created successfully", portfolio });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getAllPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find()
      .populate("creator", "name user_name profile_picture")
      .sort({ createdAt: -1 });

    res.status(200).json(portfolios);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getCreatorPortfolios = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const portfolios = await Portfolio.find({ creator: creatorId })
      .populate("creator", "name user_name profile_picture");

    res.status(200).json(portfolios);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    if (portfolio.creator.toString() !== req.user_id)
      return res.status(403).json({ message: "Not authorized" });

    await Portfolio.findByIdAndDelete(id);
    res.status(200).json({ message: "Portfolio deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
