import express from "express";
import { connectDB } from "./db/connectDB.js";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js"
import po_Bus_Routes from "./routes/po_bus.route.js"
import bus_routes from "./routes/bus.route.js"

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)
app.use("/api/po_bus", po_Bus_Routes)
app.use("/api/bus",bus_routes)

app.listen(PORT, ()=>{
    connectDB();
    console.log("server is running on port: ",{PORT})
})