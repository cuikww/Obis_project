import express from "express";
import { 
    create_tickets, 
    get_tiket_all_by_batch, 
    get_ticket_by_id, 
    edit_tiket_all_by_batch, 
    edit_ticket_by_id, 
    delete_tiket_all_by_batch, 
    delete_ticket_by_id,
    get_tickets_by_date
} from "../../controllers/admin-po/tiket.controller.js";

const router = express.Router();

// Endpoint untuk membuat tiket (Create)
router.post("/tiket", create_tickets);

// Endpoint untuk mendapatkan semua tiket berdasarkan batch_id (Read)
router.get("/tiket/:batch_id", get_tiket_all_by_batch);

// Endpoint untuk mendapatkan satu tiket berdasarkan ID (Read)
router.get("/tiket/id/:ticket_id", get_ticket_by_id);

router.get("/tiket/", get_tickets_by_date);

// Endpoint untuk mengedit semua tiket dalam satu batch (Update)
router.put("/tiket/:batch_id", edit_tiket_all_by_batch);

// Endpoint untuk mengedit satu tiket berdasarkan ID (Update)
router.put("/tiket/id/:ticket_id", edit_ticket_by_id);


// Endpoint untuk menghapus semua tiket dalam satu batch (Delete)
router.delete("/tiket/:batch_id", delete_tiket_all_by_batch);

// Endpoint untuk menghapus satu tiket berdasarkan ID (Delete)
router.delete("/tiket/id/:ticket_id", delete_ticket_by_id);

export default router;