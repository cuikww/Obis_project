import { Ticket } from "../../models/ticket.model.js";
import { Bus } from "../../models/bus.model.js";
import { Seat } from "../../models/seat.model.js";
import { Terminal } from "../../models/terminal.model.js";
import { validate_admin_po } from "../../middleware/verifyAdminPO.js";

// Fungsi untuk menghasilkan batch ID yang ringkas
const generateBatchId = async (busName, terminalKeberangkatanId, terminalTujuanId) => {
    const safeBusName = busName || "BUS"; // Fallback singkat
    const terminalKeberangkatan = await Terminal.findById(terminalKeberangkatanId).populate("kota", "nama_kota");
    const terminalTujuan = await Terminal.findById(terminalTujuanId).populate("kota", "nama_kota");
    const kotaKeberangkatan = terminalKeberangkatan?.kota?.nama_kota || "UNK";
    const kotaTujuan = terminalTujuan?.kota?.nama_kota || "UNK";
    const timestamp = Date.now().toString().slice(-6); // 6 digit terakhir timestamp
    const randomStr = Math.random().toString(36).substring(2, 5); // 3 karakter random
    return `${safeBusName.slice(0, 3)}-${kotaKeberangkatan.slice(0, 4)}-${kotaTujuan.slice(0, 4)}-${timestamp}-${randomStr}`;
};

// CREATE: Membuat tiket
export const create_tickets = async (req, res) => {
    const { bus_id, waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan } = req.body;

    try {
        const po_bus_id = await validate_admin_po(req);

        const bus = await Bus.findOne({ _id: bus_id, po_bus: po_bus_id });
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
        }

        // Validate terminals
        const terminalKeberangkatanDoc = await Terminal.findById(terminal_keberangkatan);
        const terminalTujuanDoc = await Terminal.findById(terminal_tujuan);
        if (!terminalKeberangkatanDoc || !terminalTujuanDoc) {
            return res.status(404).json({ success: false, message: "One or both terminals not found!" });
        }

        let seats = await Seat.find({ bus_id });
        if (seats.length === 0) {
            const seatData = [];
            for (let i = 1; i <= bus.kapasitas; i++) {
                seatData.push({ bus_id, seat_number: i });
            }
            seats = await Seat.insertMany(seatData);
        }

        const batchId = await generateBatchId(bus.nama_bus, terminal_keberangkatan, terminal_tujuan);

        const tickets = seats.map(seat => ({
            waktu_keberangkatan,
            harga,
            terminal_keberangkatan,
            terminal_tujuan,
            id_kursi: seat._id,
            status_tiket: 'tersedia',
            batch_id: batchId
        }));

        const createdTickets = await Ticket.insertMany(tickets);

        res.status(201).json({
            success: true,
            message: "Tickets created successfully",
            batch_id: batchId,
            tickets: createdTickets,
        });
    } catch (error) {
        console.error("Error creating tickets:", error);
        res.status(500).json({ success: false, message: "Server error while creating tickets" });
    }
};

// READ: Mendapatkan semua tiket berdasarkan batch_id dengan validasi admin PO
export const get_tiket_all_by_batch = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { batch_id } = req.params;

        if (!batch_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Anda tidak memasukkan batch_id dengan benar!" 
            });
        }

        const tickets = await Ticket.find({ batch_id }).populate({
            path: 'id_kursi',
            populate: {
                path: 'bus_id',
                match: { po_bus: po_bus_id }
            }
        }).populate('terminal_keberangkatan', 'nama_terminal kota')
          .populate('terminal_tujuan', 'nama_terminal kota');

        const validTickets = tickets.filter(ticket => ticket.id_kursi && ticket.id_kursi.bus_id);

        if (!validTickets.length) {
            return res.status(404).json({ 
                success: false, 
                message: "Tiket tidak ditemukan atau tidak diizinkan!" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Tiket ditemukan", 
            tickets: validTickets 
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

// READ: Mendapatkan satu tiket berdasarkan ID tiket
export const get_ticket_by_id = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { ticket_id } = req.params;

        if (!ticket_id) {
            return res.status(400).json({ success: false, message: "Ticket ID is required" });
        }

        const ticket = await Ticket.findById(ticket_id).populate({
            path: 'id_kursi',
            populate: {
                path: 'bus_id',
                match: { po_bus: po_bus_id }
            }
        }).populate('terminal_keberangkatan', 'nama_terminal kota')
          .populate('terminal_tujuan', 'nama_terminal kota');

        if (!ticket || !ticket.id_kursi || !ticket.id_kursi.bus_id) {
            return res.status(404).json({ success: false, message: "Ticket not found or unauthorized" });
        }

        res.status(200).json({ success: true, ticket });
    } catch (error) {
        console.error("Error fetching ticket:", error);
        res.status(500).json({ success: false, message: "Server error while fetching ticket" });
    }
};

// UPDATE: Mengedit semua tiket dalam satu batch
export const edit_tiket_all_by_batch = async (req, res) => {
    const { batch_id } = req.params;
    const { waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan, status_tiket } = req.body;

    try {
        const po_bus_id = await validate_admin_po(req);

        const tickets = await Ticket.find({ batch_id }).populate({
            path: 'id_kursi',
            populate: {
                path: 'bus_id',
                match: { po_bus: po_bus_id }
            }
        });

        if (!tickets.length || tickets.some(ticket => !ticket.id_kursi || !ticket.id_kursi.bus_id)) {
            return res.status(404).json({ success: false, message: "Tickets not found or unauthorized" });
        }

        const activeOrders = await Order.find({
            ticket_ids: { $in: tickets.map(t => t._id) },
            status: { $in: ['pending', 'paid'] }
        });
        if (activeOrders.length > 0 && status_tiket) {
            return res.status(400).json({
                success: false,
                message: "Cannot change ticket status manually while related to active orders!"
            });
        }

        const updatedData = {};
        if (waktu_keberangkatan) updatedData.waktu_keberangkatan = waktu_keberangkatan;
        if (harga) updatedData.harga = harga;
        if (terminal_keberangkatan) updatedData.terminal_keberangkatan = terminal_keberangkatan;
        if (terminal_tujuan) updatedData.terminal_tujuan = terminal_tujuan;
        if (status_tiket && activeOrders.length === 0) updatedData.status_tiket = status_tiket;

        const updatedTickets = await Ticket.updateMany(
            { batch_id, _id: { $in: tickets.map(t => t._id) } },
            { $set: updatedData },
            { new: true }
        );

        const newTickets = await Ticket.find({ batch_id }).populate('terminal_keberangkatan', 'nama_terminal kota')
                                                            .populate('terminal_tujuan', 'nama_terminal kota');

        res.status(200).json({
            success: true,
            message: "Tickets updated successfully",
            tickets: newTickets
        });
    } catch (error) {
        console.error("Error updating tickets:", error);
        res.status(500).json({ success: false, message: "Server error while updating tickets" });
    }
};

// UPDATE: Mengedit satu tiket berdasarkan ID
export const edit_ticket_by_id = async (req, res) => {
    const { ticket_id } = req.params;
    const { waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan, status_tiket } = req.body;

    try {
        const po_bus_id = await validate_admin_po(req);

        const ticket = await Ticket.findById(ticket_id).populate({
            path: 'id_kursi',
            populate: {
                path: 'bus_id',
                match: { po_bus: po_bus_id }
            }
        });

        if (!ticket || !ticket.id_kursi || !ticket.id_kursi.bus_id) {
            return res.status(404).json({ success: false, message: "Ticket not found or unauthorized" });
        }

        const activeOrders = await Order.find({
            ticket_ids: ticket._id,
            status: { $in: ['pending', 'paid'] }
        });
        if (activeOrders.length > 0 && status_tiket) {
            return res.status(400).json({
                success: false,
                message: "Cannot change ticket status manually while related to an active order!"
            });
        }

        const updatedData = {};
        if (waktu_keberangkatan) updatedData.waktu_keberangkatan = waktu_keberangkatan;
        if (harga) updatedData.harga = harga;
        if (terminal_keberangkatan) updatedData.terminal_keberangkatan = terminal_keberangkatan;
        if (terminal_tujuan) updatedData.terminal_tujuan = terminal_tujuan;
        if (status_tiket && activeOrders.length === 0) updatedData.status_tiket = status_tiket;

        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticket_id,
            { $set: updatedData },
            { new: true }
        ).populate('terminal_keberangkatan', 'nama_terminal kota')
         .populate('terminal_tujuan', 'nama_terminal kota');

        res.status(200).json({
            success: true,
            message: "Ticket updated successfully",
            ticket: updatedTicket
        });
    } catch (error) {
        console.error("Error updating ticket:", error);
        res.status(500).json({ success: false, message: "Server error while updating ticket" });
    }
};

// DELETE: Menghapus semua tiket dalam satu batch
export const delete_tiket_all_by_batch = async (req, res) => {
    const { batch_id } = req.params;

    try {
        const po_bus_id = await validate_admin_po(req);

        const tickets = await Ticket.find({ batch_id }).populate({
            path: 'id_kursi',
            populate: {
                path: 'bus_id',
                match: { po_bus: po_bus_id }
            }
        });

        if (!tickets.length || tickets.some(ticket => !ticket.id_kursi || !ticket.id_kursi.bus_id)) {
            return res.status(404).json({ success: false, message: "Tickets not found or unauthorized" });
        }

        await Ticket.deleteMany({ batch_id, _id: { $in: tickets.map(t => t._id) } });

        res.status(200).json({
            success: true,
            message: "Tickets deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting tickets:", error);
        res.status(500).json({ success: false, message: "Server error while deleting tickets" });
    }
};

// DELETE: Menghapus satu tiket berdasarkan ID
export const delete_ticket_by_id = async (req, res) => {
    const { ticket_id } = req.params;

    try {
        const po_bus_id = await validate_admin_po(req);

        const ticket = await Ticket.findById(ticket_id).populate({
            path: 'id_kursi',
            populate: {
                path: 'bus_id',
                match: { po_bus: po_bus_id }
            }
        });

        if (!ticket || !ticket.id_kursi || !ticket.id_kursi.bus_id) {
            return res.status(404).json({ success: false, message: "Ticket not found or unauthorized" });
        }

        await Ticket.findByIdAndDelete(ticket_id);

        res.status(200).json({
            success: true,
            message: "Ticket deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting ticket:", error);
        res.status(500).json({ success: false, message: "Server error while deleting ticket" });
    }
};