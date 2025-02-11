import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { order_ticket, get_order_history, cancel_order } from "../controllers/order.controller.js";

const router = express.Router();

// ✅ Route untuk memesan tiket
router.post("/order_ticket", verifyToken, order_ticket);

// ✅ Route untuk melihat riwayat pemesanan
router.get("/history", verifyToken, get_order_history);

// ✅ Route untuk membatalkan pesanan
router.delete("/cancel/:order_id", verifyToken, cancel_order);

export default router;
