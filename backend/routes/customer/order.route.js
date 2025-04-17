import express from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { order_tickets, get_order_history, cancel_order } from "../../controllers/customer/order.controller.js";

const router = express.Router();

//Route untuk memesan tiket
router.post("/order", verifyToken, order_tickets);

//Route untuk melihat riwayat pemesanan
router.get("/orders", verifyToken, get_order_history);

//Route untuk membatalkan pesanan
router.delete("/order/:order_id", verifyToken, cancel_order);

export default router;
