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
                populate: { path: "id_kursi", model: "Seat" },
            });

        if (!orders.length) {
            return res.status(404).json({ success: false, message: "No order history found!" });
        }

        res.status(200).json({ success: true, orders });
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