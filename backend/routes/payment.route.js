import express from "express";
import { midtrans_webhook } from "../controllers/payment.controller.js";

const router = express.Router();

// Endpoint untuk menerima webhook dari Midtrans
router.post("/webhook", midtrans_webhook);

export default router;