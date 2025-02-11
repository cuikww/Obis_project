import express from "express";
import { create_tickets, get_tiket_all_by_identifier } from "../controllers/tiket.controller.js";

const router = express.Router();

// 🔹 Endpoint untuk membuat tiket
router.post("/create-tiket", create_tickets);

// 🔹 Endpoint untuk mendapatkan tiket berdasarkan ticket_identifier
router.get("/:ticket_identifier", get_tiket_all_by_identifier);

export default router;
