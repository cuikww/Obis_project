import express from "express";
import {
    get_all_kota,
    get_kota_by_id,
} from "../../controllers/super-admin/kota.controller.js";

const router = express.Router()

router.get("/kotas", get_all_kota)
router.get("/kota/id", get_kota_by_id)

export default router