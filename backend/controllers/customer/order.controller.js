import { Ticket } from "../../models/ticket.model.js";
import { Order } from "../../models/order.model.js";
import { User } from "../../models/user.model.js";
import snap from "../../config/midtrans.js";

// Memesan Tiket
export const order_tickets = async (req, res) => {
    try {
        const { ticket_ids } = req.body;
        const customer_id = req.userId;

        if (!ticket_ids || ticket_ids.length === 0) {
            return res.status(400).json({ success: false, message: "At least one ticket ID is required!" });
        }

        // Cek ketersediaan tiket
        const tickets = await Ticket.find({ _id: { $in: ticket_ids }, status_tiket: "tersedia" });
        if (tickets.length !== ticket_ids.length) {
            return res.status(400).json({ success: false, message: "Some tickets are not available!" });
        }

        const total_price = tickets.reduce((sum, ticket) => sum + ticket.harga, 0);

        // Buat order baru
        const newOrder = new Order({
            customer_id,
            ticket_ids,
            total_price,
            status: "pending",
            order_date: new Date(),
        });
        await newOrder.save();

        const user = await User.findById(customer_id);
        if (!user) {
            await Order.findByIdAndDelete(newOrder._id);
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        // Buat transaksi Midtrans
        const parameter = {
            transaction_details: {
                order_id: newOrder._id.toString(),
                gross_amount: total_price,
            },
            customer_details: {
                email: user.email,
            },
        };
        const transaction = await snap.createTransaction(parameter);

        newOrder.payment_info = transaction;
        await newOrder.save();

        // Tandai tiket sebagai "habis" hanya setelah transaksi dibuat
        await Ticket.updateMany({ _id: { $in: ticket_ids } }, { status_tiket: "habis" });

        res.status(201).json({
            success: true,
            message: "Tickets successfully booked! Please complete the payment.",
            order: newOrder,
            payment_url: transaction.redirect_url,
        });
    } catch (error) {
        console.error("Error ordering tickets:", error);
        res.status(500).json({ success: false, message: "Server error while ordering tickets" });
    }
};

// Melihat Riwayat Pemesanan
export const get_order_history = async (req, res) => {
    try {
        const customer_id = req.userId;

        const orders = await Order.find({ customer_id })
            .populate({
                path: "ticket_ids",
                populate: [
                    { 
                        path: "id_kursi", 
                        model: "Seat",
                        populate: {
                            path: "bus_id", // Populate bus_id di Seat
                            model: "Bus",
                            select: "nama_bus" // Hanya ambil nama_bus
                        }
                    },
                    { 
                        path: "terminal_keberangkatan", 
                        model: "Terminal", 
                        populate: { 
                            path: "kota", 
                            model: "Kota", 
                            select: "nama_kota" 
                        },
                        select: "nama_terminal" 
                    },
                    { 
                        path: "terminal_tujuan", 
                        model: "Terminal", 
                        populate: { 
                            path: "kota", 
                            model: "Kota", 
                            select: "nama_kota" 
                        },
                        select: "nama_terminal" 
                    }
                ]
            });

        if (!orders.length) {
            return res.status(404).json({ success: false, message: "No order history found!" });
        }

        // Transformasi respons agar lebih ramah frontend
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            customer_id: order.customer_id,
            ticket_ids: order.ticket_ids.map(ticket => ({
                _id: ticket._id,
                waktu_keberangkatan: ticket.waktu_keberangkatan,
                harga: ticket.harga,
                terminal_keberangkatan: {
                    nama_terminal: ticket.terminal_keberangkatan?.nama_terminal || "Unknown Terminal",
                    kota: ticket.terminal_keberangkatan?.kota?.nama_kota || "Unknown City"
                },
                terminal_tujuan: {
                    nama_terminal: ticket.terminal_tujuan?.nama_terminal || "Unknown Terminal",
                    kota: ticket.terminal_tujuan?.kota?.nama_kota || "Unknown City"
                },
                id_kursi: {
                    _id: ticket.id_kursi?._id,
                    seat_number: ticket.id_kursi?.seat_number
                },
                status_tiket: ticket.status_tiket,
                batch_id: ticket.batch_id,
                nama_bus: ticket.id_kursi?.bus_id?.nama_bus || "Unknown Bus", // Ambil nama_bus dari relasi
            })),
            total_price: order.total_price,
            status: order.status,
            order_date: order.order_date,
            payment_info: order.payment_info
        }));

        res.status(200).json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error("Error fetching order history:", error);
        res.status(500).json({ success: false, message: "Server error while fetching order history" });
    }
};

// Membatalkan Pesanan
export const cancel_order = async (req, res) => {
    try {
        const { order_id } = req.params;
        const customer_id = req.userId;

        const order = await Order.findOne({ _id: order_id, customer_id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or unauthorized!" });
        }

        // Hanya izinkan pembatalan manual jika status "pending"
        if (order.status !== "pending") {
            return res.status(400).json({ success: false, message: "Only pending orders can be canceled manually!" });
        }

        // Kembalikan tiket ke "tersedia"
        await Ticket.updateMany(
            { _id: { $in: order.ticket_ids } },
            { status_tiket: "tersedia" }
        );

        // Update status order ke "canceled"
        order.status = "canceled";
        await order.save();

        res.status(200).json({ success: true, message: "Order successfully canceled!" });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ success: false, message: "Server error while canceling order" });
    }
};