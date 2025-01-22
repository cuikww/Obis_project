import { User } from "../models/user.model.js"; // Model untuk Admin PO
import { Bus } from "../models/bus.model.js";  // Model untuk Bus
import jwt from 'jsonwebtoken'

export const add_bus = async (req, res) => {
    const { po_bus_id, nama_bus, kapasitas } = req.body;
    const token = req.cookies.token;
    try {
        // Validasi input
        if (!po_bus_id || !nama_bus || !kapasitas) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Cek apakah nama bus sudah ada
        const is_nama_bus_already_exist = await Bus.findOne({ nama_bus });
        if (is_nama_bus_already_exist) {
            return res.status(400).json({ success: false, message: "Nama bus already exists" });
        }

        // Validasi apakah po_bus_id valid dan milik admin yang sedang login
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        const admin = await User.findById(req.userId); 

        // Mengonversi po_bus_id dan admin.po_bus ke string untuk perbandingan
        const poBusIdString = po_bus_id.toString(); 
        const adminPoBusString = admin.po_bus.toString();

        // Perbandingan dengan string
        if (!admin || adminPoBusString !== poBusIdString) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to add buses for this PO Bus",
            });
        }
        const newBus = new Bus({
            po_bus: po_bus_id,
            nama_bus,
            kapasitas,
        });

        await newBus.save();

        res.status(201).json({
            success: true,
            message: "Bus successfully added",
            bus: newBus,
        });
    } catch (error) {
        console.error("Error adding bus:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding bus",
        });
    }
};

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

    return admin; // Return admin if valid
};

export const get_bus_by_id = async (req, res) => {
    const { bus_id } = req.params;
    try {
        if (!bus_id) {
            return res.status(400).json({ success: false, message: "Bus ID is required" });
        }

        const bus = await Bus.findById(bus_id);
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found" });
        }

        res.status(200).json({ success: true, bus });
    } catch (error) {
        console.error("Error fetching bus:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching bus",
        });
    }
};

export const get_all_buses_for_po = async (req, res) => {
    const { po_bus_id } = req.params;
    try {
        // Validasi admin PO
        await validate_admin_po(req, po_bus_id);

        const buses = await Bus.find({po_bus:po_bus_id});

        if (!buses || buses.length === 0) {
            return res.status(404).json({ success: false, message: "No buses found for this PO Bus" });
        }

        console.log("Buses: ", buses);

        res.status(200).json({
            success: true,
            buses,
        });
    } catch (error) {
        console.error("Error fetching buses:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error while fetching buses",
        });
    }
};

export const delete_bus = async (req, res) => {
    const { bus_id } = req.params;
    const { po_bus_id } = req.body;

    try {
        if (!bus_id || !po_bus_id) {
            return res.status(400).json({ success: false, message: "Bus ID and PO Bus ID are required" });
        }

        const admin = await validate_admin_po(req, po_bus_id);

        const deletedBus = await Bus.findByIdAndDelete(bus_id);

        if (!deletedBus) {
            return res.status(404).json({ success: false, message: "Bus not found" });
        }

        res.status(200).json({
            success: true,
            message: "Bus successfully deleted",
        });
    } catch (error) {
        console.error("Error deleting bus:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting bus",
        });
    }
};
export const update_bus = async (req, res) => {
    const { bus_id } = req.params;
    const { po_bus_id, nama_bus, kapasitas } = req.body;

    try {
        if (!bus_id || !po_bus_id || !nama_bus || !kapasitas) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        await validate_admin_po(req, po_bus_id);

        const updatedBus = await Bus.findByIdAndUpdate(
            bus_id,
            { po_bus_id, nama_bus, kapasitas },
            { new: true }
        );

        if (!updatedBus) {
            return res.status(404).json({ success: false, message: "Bus not found" });
        }

        res.status(200).json({
            success: true,
            message: "Bus successfully updated",
            bus: updatedBus,
        });
    } catch (error) {
        console.error("Error updating bus:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating bus",
        });
    }
};

