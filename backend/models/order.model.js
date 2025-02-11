import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticket_id: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    status: { type: String, enum: ["pending", "paid", "canceled"], default: "pending" },
    order_date: { type: Date, default: Date.now },
});

export const Order = mongoose.model("Order", OrderSchema);
