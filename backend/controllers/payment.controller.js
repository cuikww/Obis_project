import { Order } from "../models/order.model.js";
import { Ticket } from "../models/ticket.model.js";
import mongoose from "mongoose";

export const midtrans_webhook = async (req, res) => {
    try {
        console.log("Webhook received:", JSON.stringify(req.body, null, 2));

        const { order_id, transaction_status, status_code } = req.body;

        if (!order_id || !transaction_status || !status_code) {
            console.log("Invalid webhook data:", req.body);
            return res.status(400).json({ success: false, message: "Invalid webhook data!" });
        }

        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            console.log(`Invalid order_id format: ${order_id}. Likely a test notification. Skipping processing.`);
            return res.status(200).json({ success: true, message: "Test notification received, no action taken" });
        }

        const order = await Order.findById(order_id);
        if (!order) {
            console.log("Order not found for ID:", order_id);
            return res.status(404).json({ success: false, message: "Order not found!" });
        }

        if (transaction_status === "settlement" && status_code === "200") {
            console.log(`Updating order ${order_id} to paid`);
            order.status = "paid";
            // Tiket tetap "habis" karena pembayaran sukses
        } else if (
            transaction_status === "cancel" ||
            transaction_status === "expire" ||
            transaction_status === "deny" ||
            transaction_status === "failure"
        ) {
            console.log(`Updating order ${order_id} to canceled`);
            order.status = "canceled";
            await Ticket.updateMany(
                { _id: { $in: order.ticket_ids } },
                { status_tiket: "tersedia" }
            );
            console.log(`Tickets ${order.ticket_ids} set back to tersedia`);
        } else {
            console.log(`Unhandled transaction_status: ${transaction_status}`);
            // Status "pending" tidak perlu mengubah tiket
        }

        await order.save();
        console.log(`Order ${order_id} updated successfully`);

        res.status(200).json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Error processing Midtrans webhook:", error);
        res.status(500).json({ success: false, message: "Server error while processing webhook" });
    }
};