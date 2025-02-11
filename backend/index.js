import express from "express";
import { connectDB } from "./db/connectDB.js";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js"
import po_Bus_Routes from "./routes/po_bus.route.js"
import bus_routes from "./routes/bus.route.js"
import seat_routes from "./routes/seat.route.js"
import kota from "./routes/kota.route.js"
import terminal from "./routes/terminal.route.js"
import tiket from "./routes/tiket.route.js"
import order from "./routes/order.route.js"

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)
app.use("/api/po_bus", po_Bus_Routes)
app.use("/api/bus",bus_routes)
app.use("/api/seat", seat_routes)
app.use("/api/kota",kota)
app.use("/api/terminal",terminal)
app.use("/api/tiket",tiket)
app.use("/api/order",order)

app.listen(PORT, ()=>{
    connectDB();
    console.log("server is running on port: ",{PORT})
})