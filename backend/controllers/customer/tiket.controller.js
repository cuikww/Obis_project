// customer/ticket.controller.js
import { Ticket } from "../../models/ticket.model.js";
import { Terminal } from "../../models/terminal.model.js";

// Fungsi bantu untuk memvalidasi input
const validateInput = (kotaKeberangkatan, kotaTujuan, tanggalKeberangkatan) => {
    if (!kotaKeberangkatan || !kotaTujuan) {
        throw new Error("Kota keberangkatan dan tujuan harus diisi!");
    }
    if (tanggalKeberangkatan && !/^\d{4}-\d{2}-\d{2}$/.test(tanggalKeberangkatan)) {
        throw new Error("Format tanggal keberangkatan harus YYYY-MM-DD!");
    }
};

// Fungsi bantu untuk mendapatkan ID terminal berdasarkan kota
const getTerminalIds = async (kotaId) => {
    const terminals = await Terminal.find({ kota: kotaId });
    if (!terminals.length) {
        throw new Error("Tidak ada terminal yang ditemukan untuk kota tersebut!");
    }
    return terminals.map(terminal => terminal._id);
};

// Fungsi bantu untuk mengambil tiket berdasarkan terminal dan tanggal
const fetchTickets = async (terminalIdsKeberangkatan, terminalIdsTujuan, tanggalKeberangkatan) => {
    const query = {
        kota_keberangkatan: { $in: terminalIdsKeberangkatan },
        kota_tujuan: { $in: terminalIdsTujuan }
    };

    if (tanggalKeberangkatan) {
        const startOfDay = new Date(tanggalKeberangkatan);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(tanggalKeberangkatan);
        endOfDay.setUTCHours(23, 59, 59, 999);

        query.waktu_keberangkatan = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }

    const tickets = await Ticket.find(query)
        .populate({
            path: 'id_kursi',
            populate: { path: 'bus_id', select: 'nama_bus kapasitas' }
        })
        .populate({
            path: 'kota_keberangkatan',
            populate: { path: 'kota', select: 'nama_kota' }
        })
        .populate({
            path: 'kota_tujuan',
            populate: { path: 'kota', select: 'nama_kota' }
        });

    if (!tickets.length) {
        throw new Error("Tidak ada tiket tersedia untuk rute ini!");
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
            kota: firstTicket.kota_keberangkatan?.kota?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.kota_keberangkatan?.nama_terminal ?? "Terminal Tidak Diketahui"
        },
        tujuan: {
            kota: firstTicket.kota_tujuan?.kota?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.kota_tujuan?.nama_terminal ?? "Terminal Tidak Diketahui"
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
            kota: firstTicket.kota_keberangkatan?.kota?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.kota_keberangkatan?.nama_terminal ?? "Terminal Tidak Diketahui"
        },
        tujuan: {
            kota: firstTicket.kota_tujuan?.kota?.nama_kota ?? "Tidak Diketahui",
            terminal: firstTicket.kota_tujuan?.nama_terminal ?? "Terminal Tidak Diketahui"
        },
        waktu_keberangkatan: firstTicket.waktu_keberangkatan,
        harga: firstTicket.harga,
        tiket_tersedia: availableTickets.length,
        total_kursi: tickets.length,
        status: availableTickets.length > 0 ? "Tersedia" : "Habis",
        kursi_detail: tickets.map(ticket => ({
            ticket_id: ticket._id, // Tambahkan ticket_id
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

        const terminalIdsKeberangkatan = await getTerminalIds(kota_keberangkatan);
        const terminalIdsTujuan = await getTerminalIds(kota_tujuan);
        const tickets = await fetchTickets(terminalIdsKeberangkatan, terminalIdsTujuan, tanggal_keberangkatan);

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
                populate: { path: 'bus_id', select: 'nama_bus kapasitas' }
            })
            .populate({
                path: 'kota_keberangkatan',
                populate: { path: 'kota', select: 'nama_kota' }
            })
            .populate({
                path: 'kota_tujuan',
                populate: { path: 'kota', select: 'nama_kota' }
            });

        if (!tickets.length) {
            throw new Error("Batch tiket tidak ditemukan!");
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