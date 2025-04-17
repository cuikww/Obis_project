import { Bus } from "../../models/bus.model.js";
import { validate_admin_po } from "../../middleware/verifyAdminPO.js";

export const add_bus = async (req, res) => {
    const { nama_bus, kapasitas } = req.body;
    try {
        if (!nama_bus || !kapasitas) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const po_bus_id = await validate_admin_po(req);

        const is_nama_bus_already_exist = await Bus.findOne({ nama_bus });
        if (is_nama_bus_already_exist) {
            return res.status(400).json({ success: false, message: "Nama bus already exists" });
        }

        const newBus = new Bus({
            po_bus: po_bus_id,
            nama_bus,
            kapasitas,
        });

        await newBus.save();

        res.status(201).json({ success: true, message: "Bus successfully added", bus: newBus });
    } catch (error) {
        console.error("Error adding bus:", error);
        res.status(500).json({ success: false, message: "Server error while adding bus" });
    }
};

export const get_bus_by_id = async (req, res) => {
    const { bus_id } = req.params;

    try {
        if (!bus_id) {
            return res.status(400).json({ success: false, message: "Bus ID is required" });
        }

        const po_bus_id = await validate_admin_po(req); // Ambil PO Bus ID dari token

        const bus = await Bus.findOne({ _id: bus_id, po_bus: po_bus_id });

        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
        }

        res.status(200).json({ success: true, bus });
    } catch (error) {
        console.error("Error fetching bus:", error);
        res.status(500).json({ success: false, message: "Server error while fetching bus" });
    }
};

export const get_all_buses_for_po = async (req, res) => {
    try {
        const po_bus_id = await validate_admin_po(req);
        const buses = await Bus.find({ po_bus: po_bus_id });

        if (!buses || buses.length === 0) {
            return res.status(404).json({ success: false, message: "No buses found for this PO Bus" });
        }

        res.status(200).json({ success: true, buses });
    } catch (error) {
        console.error("Error fetching buses:", error.message);
        res.status(500).json({ success: false, message: "Server error while fetching buses" });
    }
};

export const delete_bus = async (req, res) => {
    const { bus_id } = req.params;
    try {
        if (!bus_id) {
            return res.status(400).json({ success: false, message: "Bus ID is required" });
        }

        const po_bus_id = await validate_admin_po(req);

        const deletedBus = await Bus.findOneAndDelete({ _id: bus_id, po_bus: po_bus_id });

        if (!deletedBus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
        }

        res.status(200).json({ success: true, message: "Bus successfully deleted" });
    } catch (error) {
        console.error("Error deleting bus:", error);
        res.status(500).json({ success: false, message: "Server error while deleting bus" });
    }
};

export const update_bus = async (req, res) => {
    const { bus_id } = req.params;
    const { nama_bus, kapasitas } = req.body;
    try {
        if (!bus_id || !nama_bus || !kapasitas) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const po_bus_id = await validate_admin_po(req);

        const updatedBus = await Bus.findOneAndUpdate(
            { _id: bus_id, po_bus: po_bus_id },
            { nama_bus, kapasitas },
            { new: true }
        );

        if (!updatedBus) {
            return res.status(404).json({ success: false, message: "Bus not found or unauthorized" });
        }

        res.status(200).json({ success: true, message: "Bus successfully updated", bus: updatedBus });
    } catch (error) {
        console.error("Error updating bus:", error);
        res.status(500).json({ success: false, message: "Server error while updating bus" });
    }
};
