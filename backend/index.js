import express from "express";
import { connectDB } from "./db/connectDB.js";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js"
import po_Bus_Routes from "./routes/super-admin/po_bus.route.js"
import kota from "./routes/super-admin/kota.route.js"

import bus_routes from "./routes/admin-po/bus.route.js"
import seat_routes from "./routes/admin-po/seat.route.js"
import terminal from "./routes/admin-po/terminal.route.js"
import tiket from "./routes/admin-po/tiket.route.js"
import po_order from "./routes/admin-po/order.route.js"

import customer_tiket from "./routes/customer/tiket.route.js"
import customer_kota from "./routes/customer/kota.route.js"
import order from "./routes/customer/order.route.js"

import paymentRoutes from "./routes/payment.route.js";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(cookieParser())

app.use("/auth", authRoutes)
app.use("/super-admin", po_Bus_Routes)
app.use("/super-admin",kota)

app.use("/admin-po",bus_routes)
app.use("/admin-po",seat_routes)
app.use("/admin-po",terminal)
app.use("/admin-po",tiket)
app.use("/admin-po",po_order)

app.use("/customer",customer_tiket)
app.use("/customer",customer_kota)
app.use("/customer",order)

app.use("/payment",paymentRoutes)

connectDB()
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app