import express from "express"
import { addPO_Bus, get_po_byID, deletePO , editPO} from "../controllers/po_bus.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();

router.post("/add_po_bus",verifyToken,verifyRole(["super-admin"]), addPO_Bus)
router.get("/get_po_byID/:id_po",verifyToken,verifyRole(["super-admin"]), get_po_byID)
router.delete("/delete_po/:id_po", verifyToken,verifyRole(["super-admin"]), deletePO)
router.put("/edit_po", verifyToken, verifyRole(["super-admin"]), editPO);

export default router;