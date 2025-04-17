import express from "express";
import { get_orders_by_po } from "../../controllers/admin-po/order.controller.js";

const router = express.Router();

router.get("/orders", get_orders_by_po);

export default router;
