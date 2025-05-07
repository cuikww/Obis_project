// order.controller.js
import { Order } from "../../models/order.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { Bus } from "../../models/bus.model.js";
import { Seat } from "../../models/seat.model.js";
import { validate_admin_po } from "../../middleware/verifyAdminPO.js";

// READ: Mendapatkan semua order berdasarkan PO Bus yang dikelola admin
export const get_orders_by_po = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);

        const buses = await Bus.find({ po_bus: po_bus_id });
        if (!buses || buses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No buses found for this PO Bus",
            });
        }

        const busIds = buses.map((bus) => bus._id);
        const tickets = await Ticket.find({
            id_kursi: {
                $in: await Seat.find({ bus_id: { $in: busIds } }).distinct("_id"),
            },
        });
        const ticketIds = tickets.map((ticket) => ticket._id);

        const orders = await Order.find({
            ticket_ids: { $in: ticketIds },
        })
            .populate("customer_id", "nama email")
            .populate({
                path: "ticket_ids",
                populate: [
                    { path: "kota_keberangkatan", select: "nama_kota" },
                    { path: "kota_tujuan", select: "nama_kota" },
                    {
                        path: "id_kursi",
                        populate: { path: "bus_id", select: "nama_bus" },
                    },
                ],
            });

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No orders found for this PO Bus",
            });
        }

        const formattedOrders = orders.map((order) => ({
            ...order._doc,
            customer_info: order.is_offline
                ? { nama: order.nama, no_telepon: order.no_telepon, email: order.email }
                : order.customer_id
                ? { nama: order.customer_id.nama, email: order.customer_id.email }
                : null,
        }));

        res.status(200).json({
            success: true,
            message: "Orders retrieved successfully",
            orders: formattedOrders,
        });
    } catch (error) {
        console.error("Error fetching orders by PO:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching orders",
            error: error.message,
        });
    }
};

// CREATE: Membuat order offline baru dengan total_price otomatis
export const create_order_offline = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { ticket_ids, status, nama, no_telepon, email } = req.body;

        // Validasi input
        if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Ticket IDs are required and must be an array",
            });
        }
        if (!nama || !no_telepon) {
            return res.status(400).json({
                success: false,
                message: "Name and phone number are required for offline orders",
            });
        }

        // Validasi ticket_ids
        const tickets = await Ticket.find({
            _id: { $in: ticket_ids },
            status_tiket: "tersedia",
        });
        if (tickets.length !== ticket_ids.length) {
            return res.status(400).json({
                success: false,
                message: "Some ticket IDs are invalid or not available",
            });
        }

        // Validasi bahwa tiket terkait dengan bus dari PO yang sama
        const busIds = await Seat.find({
            _id: { $in: tickets.map((t) => t.id_kursi) },
        }).distinct("bus_id");
        const buses = await Bus.find({ _id: { $in: busIds }, po_bus: po_bus_id });
        if (buses.length !== busIds.length) {
            return res.status(403).json({
                success: false,
                message: "Some tickets belong to buses not managed by this PO",
            });
        }

        // Hitung total_price dari harga tiket
        const total_price = tickets.reduce((sum, ticket) => sum + ticket.harga, 0);

        // Buat data order offline
        const orderData = {
            ticket_ids,
            total_price,
            status: status || "pending",
            is_offline: true,
            nama,
            no_telepon,
            email: email || null,
        };

        const newOrder = new Order(orderData);
        await newOrder.save();

        // Update status_tiket menjadi "terjual"
        await Ticket.updateMany(
            { _id: { $in: ticket_ids } },
            { status_tiket: "terjual" }
        );

        res.status(201).json({
            success: true,
            message: "Offline order created successfully",
            order: newOrder,
        });
    } catch (error) {
        console.error("Error creating offline order:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating offline order",
            error: error.message,
        });
    }
};

// UPDATE: Memperbarui order (hanya untuk order offline)
export const update_order = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { order_id } = req.params;
        const { ticket_ids, status, nama, no_telepon, email } = req.body;

        // Cari order
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Batasi hanya untuk order offline
        if (!order.is_offline) {
            return res.status(403).json({
                success: false,
                message: "Admin PO cannot modify online orders",
            });
        }

        // Validasi bahwa order terkait dengan PO
        const tickets = await Ticket.find({ _id: { $in: order.ticket_ids } });
        const busIds = await Seat.find({
            _id: { $in: tickets.map((t) => t.id_kursi) },
        }).distinct("bus_id");
        const buses = await Bus.find({ _id: { $in: busIds }, po_bus: po_bus_id });
        if (buses.length !== busIds.length) {
            return res.status(403).json({
                success: false,
                message: "Order belongs to buses not managed by this PO",
            });
        }

        // Jika ticket_ids diperbarui, hitung ulang total_price
        if (ticket_ids) {
            const newTickets = await Ticket.find({
                _id: { $in: ticket_ids },
                status_tiket: "tersedia",
            });
            if (newTickets.length !== ticket_ids.length) {
                return res.status(400).json({
                    success: false,
                    message: "Some ticket IDs are invalid or not available",
                });
            }
            order.ticket_ids = ticket_ids;
            order.total_price = newTickets.reduce((sum, ticket) => sum + ticket.harga, 0);

            // Kembalikan status tiket lama ke "tersedia"
            await Ticket.updateMany(
                { _id: { $in: order.ticket_ids } },
                { status_tiket: "tersedia" }
            );
            // Update status tiket baru ke "terjual"
            await Ticket.updateMany(
                { _id: { $in: ticket_ids } },
                { status_tiket: "terjual" }
            );
        }

        // Update data lainnya
        if (status) order.status = status;
        if (nama) order.nama = nama;
        if (no_telepon) order.no_telepon = no_telepon;
        if (email !== undefined) order.email = email;

        await order.save();

        res.status(200).json({
            success: true,
            message: "Order updated successfully",
            order,
        });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating order",
            error: error.message,
        });
    }
};

// DELETE: Menghapus order (hanya untuk order offline)
export const delete_order = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const { order_id } = req.params;

        // Cari order
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Batasi hanya untuk order offline
        if (!order.is_offline) {
            return res.status(403).json({
                success: false,
                message: "Admin PO cannot delete online orders",
            });
        }

        // Validasi bahwa order terkait dengan PO
        const tickets = await Ticket.find({ _id: { $in: order.ticket_ids } });
        const busIds = await Seat.find({
            _id: { $in: tickets.map((t) => t.id_kursi) },
        }).distinct("bus_id");
        const buses = await Bus.find({ _id: { $in: busIds }, po_bus: po_bus_id });
        if (buses.length !== busIds.length) {
            return res.status(403).json({
                success: false,
                message: "Order belongs to buses not managed by this PO",
            });
        }

        // Hapus order
        await Order.deleteOne({ _id: order_id });

        // Kembalikan status_tiket ke "tersedia"
        await Ticket.updateMany(
            { _id: { $in: order.ticket_ids } },
            { status_tiket: "tersedia" }
        );

        res.status(200).json({
            success: true,
            message: "Order deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting order",
            error: error.message,
        });
    }
};