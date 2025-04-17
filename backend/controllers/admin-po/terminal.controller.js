import { Terminal } from "../../models/terminal.model.js";
import { Kota } from "../../models/kota.model.js";

// Add a new terminal
export const add_terminal = async (req, res) => {
    const { kota, nama_terminal } = req.body;

    try {
        if (!kota || !nama_terminal) {
            return res.status(400).json({ success: false, message: "Kota dan nama terminal harus diisi!" });
        }

        const kotaExists = await Kota.findById(kota);
        if (!kotaExists) {
            return res.status(404).json({ success: false, message: "Kota tidak ditemukan!" });
        }

        const newTerminal = new Terminal({ kota, nama_terminal });
        await newTerminal.save();

        res.status(201).json({ success: true, message: "Terminal berhasil ditambahkan!", terminal: newTerminal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all terminals
export const get_all_terminals = async (req, res) => {
    try {
        const terminals = await Terminal.find().populate("kota", "nama_kota");
        res.status(200).json({ success: true, terminals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get terminal by ID
export const get_terminal_by_id = async (req, res) => {
    const { id } = req.params;

    try {
        const terminal = await Terminal.findById(id).populate("kota", "nama_kota");
        if (!terminal) {
            return res.status(404).json({ success: false, message: "Terminal tidak ditemukan!" });
        }

        res.status(200).json({ success: true, terminal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update terminal
export const update_terminal = async (req, res) => {
    const { id } = req.params;
    const { nama_terminal } = req.body;

    try {
        const terminal = await Terminal.findById(id);
        if (!terminal) {
            return res.status(404).json({ success: false, message: "Terminal tidak ditemukan!" });
        }

        terminal.nama_terminal = nama_terminal || terminal.nama_terminal;
        await terminal.save();

        res.status(200).json({ success: true, message: "Terminal berhasil diperbarui!", terminal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete terminal
export const delete_terminal = async (req, res) => {
    const { id: terminalId } = req.params;
    try {
        const terminal = await Terminal.findById(terminalId);
        if (!terminal) {
            return res.status(404).json({ success: false, message: "Terminal tidak ditemukan!" });
        }

        // Hapus terminal
        await Terminal.findByIdAndDelete(terminalId);

        res.status(200).json({
            success: true,
            message: "Terminal berhasil dihapus!",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
