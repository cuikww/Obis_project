import express from "express";
import { 
    add_terminal, 
    get_all_terminals, 
    get_terminal_by_id, 
    update_terminal, 
    delete_terminal 
} from "../../controllers/admin-po/terminal.controller.js";
import { verifyToken } from "../../middleware/verifyToken.js";
import { verifyRole } from "../../middleware/verifyRole.js";

const router = express.Router();

// Routes for super-admin and admin-po
router.post("/terminals", verifyToken, verifyRole(["super-admin", "admin-po"]), add_terminal);
router.get("/terminals", verifyToken, verifyRole(["super-admin", "admin-po"]), get_all_terminals);
router.get("/terminals/:id", verifyToken, verifyRole(["super-admin", "admin-po"]), get_terminal_by_id);
router.put("/terminals/:id", verifyToken, verifyRole(["super-admin", "admin-po"]), update_terminal);
router.delete("/terminals/:id", verifyToken, verifyRole(["super-admin", "admin-po"]), delete_terminal);

export default router;
