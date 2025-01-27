import jwt from 'jsonwebtoken'
import { User } from "../models/user.model.js";

export const validate_admin_po = async (req, po_bus_id) => {
    const token = req.cookies.token;
    if (!token) {
        throw new Error("Authentication token is required");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    const admin = await User.findById(req.userId);
    if (!admin) {
        throw new Error("Admin not found");
    }

    const adminPoBusString = admin.po_bus.toString();
    const poBusIdString = po_bus_id.toString();

    if (adminPoBusString !== poBusIdString) {
        throw new Error("You do not have permission for this PO Bus");
    }

    return admin;
};