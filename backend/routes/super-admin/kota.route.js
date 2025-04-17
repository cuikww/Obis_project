import express from "express";
import {
    add_kota,
    get_all_kota,
    get_kota_by_id,
    update_kota,
    delete_kota,
} from "../../controllers/super-admin/kota.controller.js";
import { verifyToken } from "../../middleware/verifyToken.js";
import { verifyRole } from "../../middleware/verifyRole.js";

const router = express.Router();

// Tambah kota
router.post("/kota", verifyToken, verifyRole(["super-admin"]), add_kota);

// Dapatkan semua kota
router.get("/kotas", get_all_kota);

// Dapatkan kota berdasarkan ID
router.get("/kota/:id", get_kota_by_id);

// Perbarui kota
router.put("/kota/:id", verifyToken, verifyRole(["super-admin"]), update_kota);

// Hapus kota
router.delete("/kota/:id", verifyToken, verifyRole(["super-admin"]), delete_kota);

export default router;