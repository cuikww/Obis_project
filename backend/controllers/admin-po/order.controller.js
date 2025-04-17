// order.controller.js
import { Order } from "../../models/order.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { Bus } from "../../models/bus.model.js";
import { Seat } from "../../models/seat.model.js"; // Tambahkan impor ini
import { validate_admin_po } from "../../middleware/verifyAdminPO.js";

// READ: Mendapatkan semua order berdasarkan PO Bus yang dikelola admin
export const get_orders_by_po = async (req, res) => {
    try {
        // Validasi admin PO dan dapatkan po_bus_id
        const po_bus_id = await validate_admin_po(req);

        // Cari semua bus yang terkait dengan po_bus_id
        const buses = await Bus.find({ po_bus: po_bus_id });
        if (!buses || buses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No buses found for this PO Bus",
            });
        }

        // Ambil semua ID bus
        const busIds = buses.map((bus) => bus._id);

        // Cari semua tiket yang terkait dengan bus-bus tersebut
        const tickets = await Ticket.find({
            id_kursi: {
                $in: await Seat.find({ bus_id: { $in: busIds } }).distinct("_id"),
            },
        });
        const ticketIds = tickets.map((ticket) => ticket._id);

        // Cari semua order yang memiliki ticket_ids dari tiket-tiket tersebut
        const orders = await Order.find({
            ticket_ids: { $in: ticketIds },
        })
            .populate("customer_id", "nama email") // Optional: populate data customer
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

        res.status(200).json({
            success: true,
            message: "Orders retrieved successfully",
            orders,
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