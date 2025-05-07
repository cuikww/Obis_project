// order.route.js
import express from "express";
import {
    get_orders_by_po,
    create_order_offline,
    update_order,
    delete_order,
} from "../../controllers/admin-po/order.controller.js";

const router = express.Router();

// READ: Mendapatkan semua order berdasarkan PO Bus
router.get("/orders", get_orders_by_po);

// CREATE: Membuat order offline baru
router.post("/orders/offline", create_order_offline);

// UPDATE: Memperbarui order
router.put("/orders/:order_id", update_order);

// DELETE: Menghapus order
router.delete("/orders/:order_id", delete_order);

export default router;