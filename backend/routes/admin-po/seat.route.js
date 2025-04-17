import express from "express";
import {
    initialize_seats,
    get_seats_by_bus,
    add_seat,
    delete_seat
} from "../../controllers/admin-po/seat.controller.js";

const router = express.Router();

router.post("/seats/initialize", initialize_seats);
router.get("/seats/:bus_id", get_seats_by_bus);
router.post("/seat/add", add_seat);
router.delete("/seat/:seat_id", delete_seat);

export default router;
