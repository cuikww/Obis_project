import express from "express"

import { initialize_seats, get_seats_by_bus, add_seat,delete_seat } from "../controllers/seat.controller.js"

const router = express.Router();

router.post("/initialize-seats", initialize_seats);
router.post("/add-seat", add_seat);

router.get("/get-seats/:bus_id", get_seats_by_bus)

router.delete("/delete-seat", delete_seat)

export default router;