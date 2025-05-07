// order.model.js
import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // Tidak wajib
    is_offline: { type: Boolean, default: false }, // Flag untuk order offline
    nama: { type: String, required: function () { return this.is_offline; } }, // Wajib untuk offline
    no_telepon: { type: String, required: function () { return this.is_offline; } }, 
    email: { type: String, required: false }, // Opsional
    ticket_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true }],
    total_price: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "canceled"], default: "pending" },
    order_date: { type: Date, default: Date.now },
    payment_info: { type: Object },
});

export const Order = mongoose.model("Order", OrderSchema);