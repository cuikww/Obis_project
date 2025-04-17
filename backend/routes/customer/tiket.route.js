// routes/customer.js
import express from "express";
import { get_available_tickets, get_batch_detail } from "../../controllers/customer/tiket.controller.js";

const router = express.Router();

// Endpoint untuk melihat semua batch tiket yang tersedia
router.get("/tickets", get_available_tickets);

// Endpoint untuk melihat detail satu batch tiket
router.get("/tickets/:batch_id", get_batch_detail);

export default router;