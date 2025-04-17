import express from "express";
import { 
    add_bus, 
    get_bus_by_id, 
    get_all_buses_for_po, 
    delete_bus, 
    update_bus 
} from "../../controllers/admin-po/bus.controller.js";

const router = express.Router();

router.post("/bus", add_bus); // Tambah bus
router.get("/bus/:bus_id", get_bus_by_id); // Get bus by ID
router.get("/buses", get_all_buses_for_po); // Get semua bus untuk PO admin
router.put("/bus/:bus_id", update_bus); // Update bus
router.delete("/bus/:bus_id", delete_bus); // Hapus bus


export default router;
