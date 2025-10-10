import express from "express";
import { createPortfolio, deletePortfolio, getAllPortfolios, getCreatorPortfolios } from "../controllers/PortfolioController.js";
import verifyToken from "../middleware/auth.js";


const router = express.Router();
router.post("/", verifyToken, createPortfolio);
router.get("/", getAllPortfolios);
router.get("/creator/:creatorId", getCreatorPortfolios);
router.delete("/:id", verifyToken, deletePortfolio);

export default router;
