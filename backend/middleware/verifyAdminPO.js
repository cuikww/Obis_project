import jwt from 'jsonwebtoken'
import { User } from "../models/user.model.js";

export const validate_admin_po = async (req) => {
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

    return admin.po_bus;
};