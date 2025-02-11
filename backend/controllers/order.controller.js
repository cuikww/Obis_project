import { Ticket } from "../models/ticket.model.js";
import { Order } from "../models/order.model.js";
import { Seat } from "../models/seat.model.js";
import mongoose from "mongoose";

// ✅ Fungsi Customer untuk Memesan Tiket
export const order_ticket = async (req, res) => {
    try {
        const { ticket_id } = req.body; // ID tiket yang akan dipesan
        const customer_id = req.userId; // ✅ Ambil customer_id dari middleware verifyToken

        if (!ticket_id) {
            return res.status(400).json({ success: false, message: "Ticket ID is required!" });
        }

        // 🔹 Cek apakah tiket tersedia
        const ticket = await Ticket.findOne({ _id: ticket_id, status_tiket: "tersedia" });
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not available or already booked!" });
        }

        // 🔹 Periksa apakah kursi masih tersedia
        const seat = await Seat.findById(ticket.id_kursi);
        if (!seat) {
            return res.status(404).json({ success: false, message: "Seat not found!" });
        }

        // 🔹 Simpan pesanan tiket ke database
        const newOrder = new Order({
            customer_id,
            ticket_id,
            status: "pending", // Default status sebelum pembayaran dikonfirmasi
            order_date: new Date(),
        });

        await newOrder.save();

        // 🔹 Perbarui status tiket menjadi "dipesan"
        ticket.status_tiket = "habis";
        await ticket.save();

        res.status(201).json({
            success: true,
            message: "Ticket successfully booked!",
            order: newOrder,
        });
    } catch (error) {
        console.error("Error ordering ticket:", error);
        res.status(500).json({ success: false, message: "Server error while ordering ticket" });
    }
};

// ✅ Fungsi Customer untuk Melihat Riwayat Pemesanan
export const get_order_history = async (req, res) => {
    try {
        const customer_id = req.userId; // ✅ Ambil customer_id dari token

        // 🔹 Cari pesanan berdasarkan customer_id
        const orders = await Order.find({ customer_id })
            .populate({
                path: "ticket_id",
                populate: { path: "id_kursi", model: "Seat" }, // Gabungkan data kursi
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

// ✅ Fungsi Customer untuk Membatalkan Pesanan
export const cancel_order = async (req, res) => {
    try {
        const { order_id } = req.params;
        const customer_id = req.userId; // ✅ Ambil customer_id dari token

        // 🔹 Cari pesanan berdasarkan order_id dan customer_id
        const order = await Order.findOne({ _id: order_id, customer_id });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or unauthorized!" });
        }

        // 🔹 Ambil tiket yang dipesan
        const ticket = await Ticket.findById(order.ticket_id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found!" });
        }

        // 🔹 Ubah status tiket kembali menjadi "tersedia"
        ticket.status_tiket = "tersedia";
        await ticket.save();

        // 🔹 Hapus pesanan dari database
        await Order.findByIdAndDelete(order_id);

        res.status(200).json({ success: true, message: "Order successfully canceled!" });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ success: false, message: "Server error while canceling order" });
    }
};
