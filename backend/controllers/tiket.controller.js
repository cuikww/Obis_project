import { Ticket } from "../models/ticket.model.js";
import { Bus } from "../models/bus.model.js";
import { Seat } from "../models/seat.model.js";
import { validate_admin_po } from "../middleware/verifyAdminPO.js";
import { add_tiket_identifier } from "./tiket_identifier.controller.js";

import mongoose from "mongoose";

export const create_tickets = async (req, res) => {
    const { bus_id, po_bus_id, waktu_keberangkatan, harga, kota_keberangkatan, kota_tujuan } = req.body;

    try {
        await validate_admin_po(req, po_bus_id);

        const bus = await Bus.findById(bus_id).populate('po_bus');
        if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

        if (bus.po_bus._id.toString() !== po_bus_id) {
            return res.status(403).json({ success: false, message: "Unauthorized bus access" });
        }

        let seats = await Seat.find({ bus_id });
        if (seats.length === 0) {
            const seatData = [];
            for (let i = 1; i <= bus.kapasitas; i++) {
                seatData.push({ bus_id, seat_number: i });
            }
            seats = await Seat.insertMany(seatData);
        }

        // 🔹 Panggil fungsi add_tiket_identifier agar tiket menggunakan referensi dari tabel identifier
        const identifier = await add_tiket_identifier(bus.nama, kota_keberangkatan, kota_tujuan);

        // 🔹 Gunakan `identifier._id` sebagai referensi dalam tiket
        const tickets = seats.map(seat => ({
            waktu_keberangkatan,
            harga,
            kota_keberangkatan,
            kota_tujuan,
            id_kursi: seat._id,
            status_tiket: 'tersedia',
            ticket_identifier: identifier._id
        }));

        const createdTickets = await Ticket.insertMany(tickets);

        res.status(201).json({
            success: true,
            message: "Tickets created successfully",
            tickets: createdTickets,
        });
    } catch (error) {
        console.error("Error creating tickets:", error);
        res.status(500).json({ success: false, message: "Server error while creating tickets" });
    }
};

// ✅ Fungsi untuk mendapatkan tiket berdasarkan ticket_identifier
export const get_tiket_all_by_identifier = async (req, res) => {
    try {
        const { ticket_identifier } = req.params;

        if (!ticket_identifier) {
            return res.status(400).json({ 
                success: false, 
                message: "Anda tidak memasukkan identifier dengan benar!" 
            });
        }

        
        // ✅ Convert ticket_identifier to ObjectId properly
        const objectIdIdentifier = new mongoose.Types.ObjectId(ticket_identifier);
        console.log("objekIdentifier: ",objectIdIdentifier)

        // 🔹 Cari tiket berdasarkan ticket_identifier
        const tiket = await Ticket.find({ ticket_identifier: objectIdIdentifier });

        if (!tiket.length) {
            return res.status(404).json({ 
                success: false, 
                message: "Tiket tidak ditemukan!" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Tiket ditemukan", 
            tickets: tiket 
        });

    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error saat mengambil tiket", 
            error: error.message 
        });
    }
};