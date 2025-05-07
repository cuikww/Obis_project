import { Ticket } from "../../models/ticket.model.js";
import { Terminal } from "../../models/terminal.model.js";
import mongoose from "mongoose"; // Add mongoose import for ObjectId

// Fungsi bantu untuk memvalidasi input
const validateInput = (kotaKeberangkatan, kotaTujuan, tanggalKeberangkatan) => {
    if (!kotaKeberangkatan || !kotaTujuan) {
        throw new Error("Kota keberangkatan dan tujuan harus diisi!");
    }
    if (tanggalKeberangkatan && !/^\d{4}-\d{2}-\d{2}$/.test(tanggalKeberangkatan)) {
        throw new Error("Format tanggal keberangkatan harus YYYY-MM-DD!");
    }
};

// Fungsi bantu untuk mendapatkan terminal berdasarkan kota dan PO Bus
const getTerminalForPoBus = async (kotaId, poBusId) => {
    if (!kotaId || !poBusId) {
        return "Terminal Tidak Diketahui";
    }
    const terminal = await Terminal.findOne({ kota: kotaId, po_bus: poBusId });
    return terminal ? terminal.nama_terminal : "Terminal Tidak Diketahui";
};

// Fungsi bantu untuk mengambil tiket berdasarkan kota dan tanggal
const fetchTickets = async (kotaKeberangkatan, kotaTujuan, tanggalKeberangkatan) => {
    // Konversi kota ke ObjectId
    const kotaKeberangkatanId = new mongoose.Types.ObjectId(kotaKeberangkatan);
    const kotaTujuanId = new mongoose.Types.ObjectId(kotaTujuan);

    const query = {
        kota_keberangkatan: kotaKeberangkatanId, // Directly query by city ID
        kota_tujuan: kotaTujuanId // Directly query by city ID
    };

    if (tanggalKeberangkatan) {
        const startOfDay = new Date(`${tanggalKeberangkatan}T00:00:00.000Z`);
        const endOfDay = new Date(`${tanggalKeberangkatan}T23:59:59.999Z`);

        query.waktu_keberangkatan = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }

    const tickets = await Ticket.find(query)
        .populate({
            path: 'id_kursi',
            populate: { path: 'bus_id', select: 'nama_bus kapasitas po_bus' }
        })
        .populate('kota_keberangkatan', 'nama_kota') // Directly populate Kota
        .populate('kota_tujuan', 'nama_kota'); // Directly populate Kota

    if (!tickets.length) {
        throw new Error("Tidak ada tiket tersedia untuk rute ini!");
    }

    // Add terminal information to each ticket
    for (let ticket of tickets) {
        const poBusId = ticket.id_kursi?.bus_id?.po_bus;
        ticket.terminal_keberangkatan = await getTerminalForPoBus(ticket.kota_keberangkatan?._id, poBusId);
        ticket.terminal_tujuan = await getTerminalForPoBus(ticket.kota_tujuan?._id, poBusId);
    }

    return tickets;
};

// Fungsi bantu untuk mengelompokkan tiket berdasarkan batch
const groupByBatch = (tickets) => {
    const batchMap = {};
    tickets.forEach(ticket => {
        batchMap[ticket.batch_id] = batchMap[ticket.batch_id] || [];
        batchMap[ticket.batch_id].push(ticket);
    });
    return batchMap;
};

// Fungsi bantu untuk memformat satu batch
const formatBatch = (batchTickets) => {
    const firstTicket = batchTickets[0];
    const availableTickets = batchTickets.filter(t => t.status_tiket === 'tersedia').length;

    return {
        batch_id: firstTicket.batch_id,
        bus: firstTicket.id_kursi?.bus_id?.nama_bus ?? "Bus Tidak Diketahui",
        keberangkatan: {
            kota: firstTicket.kota_keberangkatan?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.terminal_keberangkatan ?? "Terminal Tidak Diketahui"
        },
        tujuan: {
            kota: firstTicket.kota_tujuan?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.terminal_tujuan ?? "Terminal Tidak Diketahui"
        },
        waktu_keberangkatan: firstTicket.waktu_keberangkatan,
        harga: firstTicket.harga,
        tiket_tersedia: availableTickets,
        total_kursi: batchTickets.length,
        status: availableTickets > 0 ? "Tersedia" : "Habis"
    };
};

// Fungsi bantu untuk memformat detail batch
const formatBatchDetail = (tickets) => {
    const firstTicket = tickets[0];
    const availableTickets = tickets.filter(t => t.status_tiket === 'tersedia');

    return {
        batch_id: firstTicket.batch_id,
        bus: firstTicket.id_kursi?.bus_id?.nama_bus ?? "Bus Tidak Diketahui",
        keberangkatan: {
            kota: firstTicket.kota_keberangkatan?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.terminal_keberangkatan ?? "Terminal Tidak Diketahui"
        },
        tujuan: {
            kota: firstTicket.kota_tujuan?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.terminal_tujuan ?? "Terminal Tidak Diketahui"
        },
        waktu_keberangkatan: firstTicket.waktu_keberangkatan,
        harga: firstTicket.harga,
        tiket_tersedia: availableTickets.length,
        total_kursi: tickets.length,
        status: availableTickets.length > 0 ? "Tersedia" : "Habis",
        kursi_detail: tickets.map(ticket => ({
            ticket_id: ticket._id,
            kursi_nomor: ticket.id_kursi?.seat_number ?? "Tidak Diketahui",
            status: ticket.status_tiket
        }))
    };
};

// Controller untuk mendapatkan semua batch tiket
export const get_available_tickets = async (req, res) => {
    try {
        const { kota_keberangkatan, kota_tujuan, tanggal_keberangkatan } = req.query;

        validateInput(kota_keberangkatan, kota_tujuan, tanggal_keberangkatan);

        const tickets = await fetchTickets(kota_keberangkatan, kota_tujuan, tanggal_keberangkatan);

        const batchMap = groupByBatch(tickets);
        const batches = Object.values(batchMap)
            .map(formatBatch)
            .sort((a, b) => new Date(a.waktu_keberangkatan) - new Date(b.waktu_keberangkatan));

        res.status(200).json({
            success: true,
            message: "Daftar tiket tersedia",
            batches
        });
    } catch (error) {
        const status = error.message.includes("Tidak ada") ? 404 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

// Controller untuk mendapatkan detail satu batch tiket
export const get_batch_detail = async (req, res) => {
    try {
        const { batch_id } = req.params;

        if (!batch_id) {
            throw new Error("Batch ID harus diisi!");
        }

        const tickets = await Ticket.find({ batch_id })
            .populate({
                path: 'id_kursi',
                populate: { path: 'bus_id', select: 'nama_bus kapasitas po_bus' }
            })
            .populate('kota_keberangkatan', 'nama_kota')
            .populate('kota_tujuan', 'nama_kota');

        if (!tickets.length) {
            throw new Error("Batch tiket tidak ditemukan!");
        }

        // Add terminal information to each ticket
        for (let ticket of tickets) {
            const poBusId = ticket.id_kursi?.bus_id?.po_bus;
            ticket.terminal_keberangkatan = await getTerminalForPoBus(ticket.kota_keberangkatan?._id, poBusId);
            ticket.terminal_tujuan = await getTerminalForPoBus(ticket.kota_tujuan?._id, poBusId);
        }

        const batch = formatBatchDetail(tickets);

        res.status(200).json({
            success: true,
            message: "Detail batch tiket",
            batch
        });
    } catch (error) {
        const status = error.message.includes("Tidak ada") ? 404 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};