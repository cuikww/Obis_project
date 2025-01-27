import { Seat } from "../models/seat.model.js";
import { Bus } from "../models/bus.model.js";
import { validate_admin_po } from "../middleware/verifyAdminPO.js"

// Menambahkan data kursi awal sesuai kapasitas bus
export const initialize_seats = async (req, res) => {
    const { bus_id, po_bus_id } = req.body;

    try {
        // Validasi admin PO
        await validate_admin_po(req, po_bus_id);

        // Cek apakah bus ada dan valid
        const bus = await Bus.findById(bus_id);
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found" });
        }

        // Hapus kursi yang sudah ada untuk bus ini (jika ada)
        await Seat.deleteMany({ bus_id });

        // Tambahkan kursi sesuai kapasitas bus
        const seats = [];
        for (let i = 1; i <= bus.kapasitas; i++) {
            seats.push({ bus_id, seat_number: i });
        }

        const createdSeats = await Seat.insertMany(seats);

        res.status(201).json({
            success: true,
            message: "Seats initialized successfully",
            seats: createdSeats,
        });
    } catch (error) {
        console.error("Error initializing seats:", error);
        res.status(500).json({
            success: false,
            message: "Server error while initializing seats",
        });
    }
};

// Mendapatkan semua kursi untuk bus tertentu
export const get_seats_by_bus = async (req, res) => {
    const { bus_id } = req.params;

    try {
        // Validasi apakah bus ada
        const bus = await Bus.findById(bus_id);
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found" });
        }

        const seats = await Seat.find({ bus_id });

        res.status(200).json({
            success: true,
            seats,
        });
    } catch (error) {
        console.error("Error fetching seats:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching seats",
        });
    }
};

// Menambahkan kursi secara manual
export const add_seat = async (req, res) => {
    const { bus_id, po_bus_id, seat_number } = req.body;

    try {
        // Validasi admin PO
        await validate_admin_po(req, po_bus_id);

        // Validasi bus
        const bus = await Bus.findById(bus_id);
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found" });
        }

        // Cek apakah kursi sudah ada
        const existingSeat = await Seat.findOne({ bus_id, seat_number });
        if (existingSeat) {
            return res.status(400).json({ success: false, message: "Seat already exists" });
        }

        // Tambahkan kursi baru
        const newSeat = new Seat({ bus_id, seat_number });
        await newSeat.save();

        res.status(201).json({
            success: true,
            message: "Seat successfully added",
            seat: newSeat,
        });
    } catch (error) {
        console.error("Error adding seat:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding seat",
        });
    }
};

// Menghapus kursi tertentu
export const delete_seat = async (req, res) => {
    const { seat_id, po_bus_id } = req.body;

    try {
        // Validasi admin PO
        await validate_admin_po(req, po_bus_id);

        // Hapus kursi
        const deletedSeat = await Seat.findByIdAndDelete(seat_id);

        if (!deletedSeat) {
            return res.status(404).json({ success: false, message: "Seat not found" });
        }

        res.status(200).json({
            success: true,
            message: "Seat successfully deleted",
        });
    } catch (error) {
        console.error("Error deleting seat:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting seat",
        });
    }
};
