import express from "express";
import {
    add_kota,
    get_all_kota,
    get_kota_by_id,
    update_kota,
    delete_kota,
} from "../controllers/kota.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();

// Tambah kota
router.post("/add-kota", verifyToken, verifyRole(["super-admin"]), add_kota);

// Dapatkan semua kota
router.get("/all-kota", verifyToken, verifyRole(["super-admin", "admin-po", "customer"]), get_all_kota);

// Dapatkan kota berdasarkan ID
router.get("/get-kota/:id", verifyToken, verifyRole(["super-admin", "admin-po","customer"]), get_kota_by_id);

// Perbarui kota
router.put("/update-kota/:id", verifyToken, verifyRole(["super-admin"]), update_kota);

// Hapus kota
router.delete("/delete-kota/:id", verifyToken, verifyRole(["super-admin"]), delete_kota);

export default router;
