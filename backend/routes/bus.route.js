import express from "express";
import { 
    add_bus, 
    get_bus_by_id, 
    get_all_buses_for_po, 
    delete_bus, 
    update_bus 
} from "../controllers/bus.controller.js";

const router = express.Router();

// Rute untuk menambahkan bus
router.post("/add-bus", add_bus);

// Rute untuk mendapatkan bus berdasarkan ID
router.get("/get-bus/:bus_id", get_bus_by_id);

// Rute untuk mendapatkan semua bus untuk PO tertentu
router.get("/get-buses/:po_bus_id", get_all_buses_for_po);

// Rute untuk menghapus bus berdasarkan ID
router.delete("/delete-bus/:bus_id", delete_bus);

// Rute untuk memperbarui bus berdasarkan ID
router.put("/update-bus/:bus_id", update_bus);

export default router;
