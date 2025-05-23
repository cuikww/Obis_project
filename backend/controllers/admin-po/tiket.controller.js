import mongoose from 'mongoose';
import { Ticket } from '../../models/ticket.model.js';
import { Bus } from '../../models/bus.model.js';
import { Seat } from '../../models/seat.model.js';
import { Terminal } from '../../models/terminal.model.js';
import { Order } from '../../models/order.model.js';
import { validate_admin_po } from '../../middleware/verifyAdminPO.js';

/**
 * Menghasilkan batch ID yang ringkas berdasarkan nama bus, terminal keberangkatan, dan tujuan
 * @param {string} busName - Nama bus
 * @param {string} terminalKeberangkatanId - ID terminal keberangkatan
 * @param {string} terminalTujuanId - ID terminal tujuan
 * @returns {Promise<string>} Batch ID yang dihasilkan
 */
const generateBatchId = async (busName, terminalKeberangkatanId, terminalTujuanId) => {
    const safeBusName = busName || 'BUS'; // Fallback singkat
    const terminalKeberangkatan = await Terminal.findById(terminalKeberangkatanId).populate('kota', 'nama_kota');
    const terminalTujuan = await Terminal.findById(terminalTujuanId).populate('kota', 'nama_kota');
    const kotaKeberangkatan = terminalKeberangkatan?.kota?.nama_kota?.slice(0, 4) || 'UNK';
    const kotaTujuan = terminalTujuan?.kota?.nama_kota?.slice(0, 4) || 'UNK';
    const timestamp = Date.now().toString().slice(-6); // 6 digit terakhir timestamp
    const randomStr = Math.random().toString(36).substring(2, 5); // 3 karakter random
    return `${safeBusName.slice(0, 3)}-${kotaKeberangkatan}-${kotaTujuan}-${timestamp}-${randomStr}`;
};

/**
 * CREATE: Membuat tiket untuk setiap kursi dalam batch
 * @route POST /api/admin-po/tiket
 * @param {Object} req.body - { bus_id, waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan }
 * @returns {Object} Respons dengan batch_id dan tiket yang dibuat
 */
export const create_tickets = async (req, res) => {
    const { bus_id, waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan } = req.body;

    try {
        const po_bus_id = await validate_admin_po(req);
        if (!po_bus_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin' });
        }

        // Validasi input
        if (!bus_id || !waktu_keberangkatan || !harga || !terminal_keberangkatan || !terminal_tujuan) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Validasi bus
        const bus = await Bus.findOne({ _id: bus_id, po_bus: po_bus_id });
        if (!bus) {
            return res.status(404).json({ success: false, message: 'Bus not found or unauthorized' });
        }

        // Validasi terminal
        const [terminalKeberangkatanDoc, terminalTujuanDoc] = await Promise.all([
            Terminal.findById(terminal_keberangkatan),
            Terminal.findById(terminal_tujuan),
        ]);
        if (!terminalKeberangkatanDoc || !terminalTujuanDoc) {
            return res.status(404).json({ success: false, message: 'One or both terminals not found' });
        }

        // Cek dan buat kursi jika belum ada
        let seats = await Seat.find({ bus_id });
        if (seats.length === 0) {
            const seatData = Array.from({ length: bus.kapasitas }, (_, i) => ({
                bus_id,
                seat_number: i + 1,
            }));
            seats = await Seat.insertMany(seatData);
        }

        // Generate batch ID
        const batchId = await generateBatchId(bus.nama_bus, terminal_keberangkatan, terminal_tujuan);

        // Buat tiket untuk setiap kursi
        const tickets = seats.map(seat => ({
            waktu_keberangkatan: new Date(waktu_keberangkatan),
            harga: parseInt(harga),
            terminal_keberangkatan,
            terminal_tujuan,
            id_kursi: seat._id,
            status_tiket: 'tersedia',
            batch_id: batchId,
        }));

        const createdTickets = await Ticket.insertMany(tickets);

        res.status(201).json({
            success: true,
            message: 'Tickets created successfully',
            batch_id: batchId,
            tickets: createdTickets,
        });
    } catch (error) {
        console.error('Error creating tickets:', error);
        res.status(500).json({ success: false, message: 'Server error while creating tickets', error: error.message });
    }
};

/**
 * READ: Mendapatkan semua tiket berdasarkan batch_id dengan validasi admin PO
 * @route GET /api/admin-po/tiket/:batch_id
 * @param {string} req.params.batch_id - ID batch tiket
 * @returns {Object} Respons dengan daftar tiket yang diurutkan berdasarkan seat_number
 */
export const get_tiket_all_by_batch = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { batch_id } = req.params;

        if (!batch_id) {
            return res.status(400).json({ success: false, message: 'Batch ID is required' });
        }

        const tickets = await Ticket.find({ batch_id })
            .populate({
                path: 'id_kursi',
                populate: { path: 'bus_id', match: { po_bus: po_bus_id }, select: 'nama_bus' },
            })
            .populate('terminal_keberangkatan', 'nama_terminal kota')
            .populate('terminal_tujuan', 'nama_terminal kota')
            .sort({ 'id_kursi.seat_number': 1 }); // Urutkan berdasarkan seat_number

        const validTickets = tickets.filter(ticket => ticket.id_kursi && ticket.id_kursi.bus_id);

        if (!validTickets.length) {
            return res.status(404).json({ success: false, message: 'No tickets found or unauthorized' });
        }

        res.status(200).json({ success: true, message: 'Tickets found', tickets: validTickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching tickets', error: error.message });
    }
};

/**
 * READ: Mendapatkan satu tiket berdasarkan ID tiket
 * @route GET /api/admin-po/tiket/:ticket_id
 * @param {string} req.params.ticket_id - ID tiket
 * @returns {Object} Respons dengan detail tiket
 */
export const get_ticket_by_id = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { ticket_id } = req.params;

        if (!ticket_id) {
            return res.status(400).json({ success: false, message: 'Ticket ID is required' });
        }

        const ticket = await Ticket.findById(ticket_id)
            .populate({
                path: 'id_kursi',
                populate: { path: 'bus_id', match: { po_bus: po_bus_id }, select: 'nama_bus' },
            })
            .populate('terminal_keberangkatan', 'nama_terminal kota')
            .populate('terminal_tujuan', 'nama_terminal kota');

        if (!ticket || !ticket.id_kursi || !ticket.id_kursi.bus_id) {
            return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized' });
        }

        res.status(200).json({ success: true, ticket });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching ticket', error: error.message });
    }
};

/**
 * UPDATE: Mengedit semua tiket dalam satu batch
 * @route PUT /api/admin-po/tiket/:batch_id
 * @param {string} req.params.batch_id - ID batch tiket
 * @param {Object} req.body - { waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan, status_tiket }
 * @returns {Object} Respons dengan tiket yang telah diupdate
 */
export const edit_tiket_all_by_batch = async (req, res) => {
    const { batch_id } = req.params;
    const { waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan, status_tiket } = req.body;

    try {
        const po_bus_id = await validate_admin_po(req);
        if (!po_bus_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin' });
        }

        // Validasi input
        if (terminal_keberangkatan && !mongoose.Types.ObjectId.isValid(terminal_keberangkatan)) {
            return res.status(400).json({ success: false, message: 'Invalid terminal_keberangkatan ID' });
        }
        if (terminal_tujuan && !mongoose.Types.ObjectId.isValid(terminal_tujuan)) {
            return res.status(400).json({ success: false, message: 'Invalid terminal_tujuan ID' });
        }
        if (waktu_keberangkatan && isNaN(new Date(waktu_keberangkatan))) {
            return res.status(400).json({ success: false, message: 'Invalid waktu_keberangkatan format' });
        }
        if (harga && (isNaN(harga) || harga < 0)) {
            return res.status(400).json({ success: false, message: 'Invalid harga value' });
        }

        // Validasi terminal
        if (terminal_keberangkatan) {
            const terminalKeberangkatanDoc = await Terminal.findById(terminal_keberangkatan);
            if (!terminalKeberangkatanDoc) {
                return res.status(404).json({ success: false, message: 'Departure terminal not found' });
            }
        }
        if (terminal_tujuan) {
            const terminalTujuanDoc = await Terminal.findById(terminal_tujuan);
            if (!terminalTujuanDoc) {
                return res.status(404).json({ success: false, message: 'Destination terminal not found' });
            }
        }

        const tickets = await Ticket.find({ batch_id }).populate({
            path: 'id_kursi',
            populate: { path: 'bus_id', match: { po_bus: po_bus_id } },
        });

        if (!tickets.length || tickets.some(ticket => !ticket.id_kursi || !ticket.id_kursi.bus_id)) {
            return res.status(404).json({ success: false, message: 'Tickets not found or unauthorized' });
        }

        const activeOrders = await Order.find({
            ticket_ids: { $in: tickets.map(t => t._id) },
            status: { $in: ['pending', 'paid'] },
        });
        if (activeOrders.length > 0 && status_tiket) {
            return res.status(400).json({
                success: false,
                message: 'Cannot change ticket status manually while related to active orders!',
            });
        }

        const updatedData = {};
        if (waktu_keberangkatan) updatedData.waktu_keberangkatan = new Date(waktu_keberangkatan);
        if (harga) updatedData.harga = parseInt(harga);
        if (terminal_keberangkatan) updatedData.terminal_keberangkatan = terminal_keberangkatan;
        if (terminal_tujuan) updatedData.terminal_tujuan = terminal_tujuan;
        if (status_tiket && activeOrders.length === 0) updatedData.status_tiket = status_tiket;

        await Ticket.updateMany(
            { batch_id, _id: { $in: tickets.map(t => t._id) } },
            { $set: updatedData },
            { new: true },
        );

        const newTickets = await Ticket.find({ batch_id })
            .populate('terminal_keberangkatan', 'nama_terminal kota')
            .populate('terminal_tujuan', 'nama_terminal kota')
            .populate({
                path: 'id_kursi',
                populate: { path: 'bus_id', select: 'nama_bus' },
            })
            .sort({ 'id_kursi.seat_number': 1 }); // Urutkan berdasarkan seat_number

        res.status(200).json({
            success: true,
            message: 'Tickets updated successfully',
            tickets: newTickets,
        });
    } catch (error) {
        console.error('Error updating tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating tickets',
            error: error.message,
        });
    }
};

/**
 * UPDATE: Mengedit satu tiket berdasarkan ID
 * @route PUT /api/admin-po/tiket/:ticket_id
 * @param {string} req.params.ticket_id - ID tiket
 * @param {Object} req.body - { waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan, status_tiket }
 * @returns {Object} Respons dengan tiket yang telah diupdate
 */
export const edit_ticket_by_id = async (req, res) => {
    const { ticket_id } = req.params;
    const { waktu_keberangkatan, harga, terminal_keberangkatan, terminal_tujuan, status_tiket } = req.body;

    try {
        const po_bus_id = await validate_admin_po(req);
        if (!po_bus_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin' });
        }

        if (!ticket_id) {
            return res.status(400).json({ success: false, message: 'Ticket ID is required' });
        }

        const ticket = await Ticket.findById(ticket_id).populate({
            path: 'id_kursi',
            populate: { path: 'bus_id', match: { po_bus: po_bus_id } },
        });
        if (!ticket || !ticket.id_kursi || !ticket.id_kursi.bus_id) {
            return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized' });
        }

        const activeOrders = await Order.find({
            ticket_ids: ticket._id,
            status: { $in: ['pending', 'paid'] },
        });
        if (activeOrders.length > 0 && status_tiket) {
            return res.status(400).json({
                success: false,
                message: 'Cannot change ticket status manually while related to an active order!',
            });
        }

        const updatedData = {};
        if (waktu_keberangkatan) updatedData.waktu_keberangkatan = new Date(waktu_keberangkatan);
        if (harga) updatedData.harga = parseInt(harga);
        if (terminal_keberangkatan) updatedData.terminal_keberangkatan = terminal_keberangkatan;
        if (terminal_tujuan) updatedData.terminal_tujuan = terminal_tujuan;
        if (status_tiket && activeOrders.length === 0) updatedData.status_tiket = status_tiket;

        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticket_id,
            { $set: updatedData },
            { new: true },
        )
            .populate('terminal_keberangkatan', 'nama_terminal kota')
            .populate('terminal_tujuan', 'nama_terminal kota');

        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            ticket: updatedTicket,
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating ticket',
            error: error.message,
        });
    }
};

/**
 * DELETE: Menghapus semua tiket dalam satu batch
 * @route DELETE /api/admin-po/tiket/:batch_id
 * @param {string} req.params.batch_id - ID batch tiket
 * @returns {Object} Respons konfirmasi penghapusan
 */
export const delete_tiket_all_by_batch = async (req, res) => {
    const { batch_id } = req.params;

    try {
        const po_bus_id = await validate_admin_po(req);
        if (!po_bus_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin' });
        }

        const tickets = await Ticket.find({ batch_id }).populate({
            path: 'id_kursi',
            populate: { path: 'bus_id', match: { po_bus: po_bus_id } },
        });

        if (!tickets.length || tickets.some(ticket => !ticket.id_kursi || !ticket.id_kursi.bus_id)) {
            return res.status(404).json({ success: false, message: 'Tickets not found or unauthorized' });
        }

        await Ticket.deleteMany({ batch_id, _id: { $in: tickets.map(t => t._id) } });

        res.status(200).json({
            success: true,
            message: 'Tickets deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting tickets',
            error: error.message,
        });
    }
};

/**
 * DELETE: Menghapus satu tiket berdasarkan ID
 * @route DELETE /api/admin-po/tiket/:ticket_id
 * @param {string} req.params.ticket_id - ID tiket
 * @returns {Object} Respons konfirmasi penghapusan
 */
export const delete_ticket_by_id = async (req, res) => {
    const { ticket_id } = req.params;

    try {
        const po_bus_id = await validate_admin_po(req);
        if (!po_bus_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin' });
        }

        if (!ticket_id) {
            return res.status(400).json({ success: false, message: 'Ticket ID is required' });
        }

        const ticket = await Ticket.findById(ticket_id).populate({
            path: 'id_kursi',
            populate: { path: 'bus_id', match: { po_bus: po_bus_id } },
        });
        if (!ticket || !ticket.id_kursi || !ticket.id_kursi.bus_id) {
            return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized' });
        }

        await Ticket.findByIdAndDelete(ticket_id);

        res.status(200).json({
            success: true,
            message: 'Ticket deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting ticket',
            error: error.message,
        });
    }
};

/**
 * READ: Mendapatkan semua tiket berdasarkan tanggal
 * @route GET /api/admin-po/tiket?date=YYYY-MM-DD
 * @param {string} req.query.date - Tanggal dalam format YYYY-MM-DD
 * @returns {Object} Respons dengan tiket dikelompokkan berdasarkan batch_id
 */
export const get_tickets_by_date = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        // Validasi format tanggal (YYYY-MM-DD)
        const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
        if (!isValidDate) {
            return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Ambil tiket untuk tanggal tertentu
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const tickets = await Ticket.find({
            waktu_keberangkatan: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate({
                path: 'id_kursi',
                populate: { path: 'bus_id', match: { po_bus: po_bus_id }, select: 'nama_bus' },
            })
            .populate('terminal_keberangkatan', 'nama_terminal kota')
            .populate('terminal_tujuan', 'nama_terminal kota')
            .sort({ 'id_kursi.seat_number': 1 }); // Urutkan berdasarkan seat_number

        const validTickets = tickets.filter(ticket => ticket.id_kursi && ticket.id_kursi.bus_id);

        if (!validTickets.length) {
            return res.status(404).json({ success: false, message: 'No tickets found for the specified date' });
        }

        // Kelompokkan tiket berdasarkan batch_id
        const ticketsByBatch = validTickets.reduce((acc, ticket) => {
            if (!acc[ticket.batch_id]) acc[ticket.batch_id] = [];
            acc[ticket.batch_id].push(ticket);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            message: 'Tickets found',
            ticketsByBatch,
        });
    } catch (error) {
        console.error('Error fetching tickets by date:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching tickets',
            error: error.message,
        });
    }
};