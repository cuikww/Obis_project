import { Seat } from "../../models/seat.model.js";
import { Bus } from "../../models/bus.model.js";
import { validate_admin_po } from "../../middleware/verifyAdminPO.js"

// Menambahkan data kursi awal sesuai kapasitas bus
export const initialize_seats = async (req, res) => {
    const { bus_id } = req.body;

    try {
        // Validasi admin PO
        const po_bus_id = await validate_admin_po(req);

        // Cek apakah bus milik admin PO yang bersangkutan
        const bus = await Bus.findOne({ _id: bus_id, po_bus: po_bus_id });
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
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
        // Validasi admin PO
        const po_bus_id = await validate_admin_po(req);

        // Validasi apakah bus milik admin PO
        const bus = await Bus.findOne({ _id: bus_id, po_bus: po_bus_id });
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
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
    const { bus_id, seat_number } = req.body;

    try {
        // Validasi admin PO
        const po_bus_id = await validate_admin_po(req);

        // Validasi bus milik admin PO
        const bus = await Bus.findOne({ _id: bus_id, po_bus: po_bus_id });
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
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
    const { seat_id } = req.params;

    try {
        // Validasi admin PO
        const po_bus_id = await validate_admin_po(req);

        // Cek apakah kursi ada dan milik bus yang dikelola oleh admin PO
        const seat = await Seat.findById(seat_id);
        if (!seat) {
            return res.status(404).json({ success: false, message: "Seat not found" });
        }

        // Pastikan bus milik PO yang sesuai
        const bus = await Bus.findOne({ _id: seat.bus_id, po_bus: po_bus_id });
        if (!bus) {
            return res.status(403).json({ success: false, message: "Unauthorized action" });
        }

        // Hapus kursi
        await Seat.findByIdAndDelete(seat_id);

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
