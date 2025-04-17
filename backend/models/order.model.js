import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticket_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true }],
    total_price: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "canceled"], default: "pending" },
    order_date: { type: Date, default: Date.now },
    payment_info: { type: Object },
});

export const Order = mongoose.model("Order", OrderSchema);