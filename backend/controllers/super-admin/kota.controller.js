import { Kota } from "../../models/kota.model.js";

// Tambah kota
export const add_kota = async (req, res) => {
    const { nama_kota } = req.body;
    try {
        if (!nama_kota) {
            return res.status(400).json({ success: false, message: "Masukkan nama kota!" });
        }
        const isKotaAlreadyExist = await Kota.findOne({ nama_kota });
        if (isKotaAlreadyExist) {
            return res.status(400).json({ success: false, message: "Nama Kota sudah ada!" });
        }
        const new_kota = new Kota({ nama_kota });
        await new_kota.save();
        res.status(201).json({ success: true, message: "Kota berhasil ditambahkan!", new_kota });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Dapatkan semua kota
export const get_all_kota = async (req, res) => {
    try {
        const kotaList = await Kota.find();
        res.status(200).json({ success: true, kotaList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Dapatkan kota berdasarkan ID
export const get_kota_by_id = async (req, res) => {
    const { id } = req.params;
    try {
        const kota = await Kota.findById(id);
        if (!kota) {
            return res.status(404).json({ success: false, message: "Kota tidak ditemukan!" });
        }
        res.status(200).json({ success: true, kota });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Perbarui kota
export const update_kota = async (req, res) => {
    const { id } = req.params;
    const { nama_kota } = req.body;
    try {
        if (!nama_kota) {
            return res.status(400).json({ success: false, message: "Masukkan nama kota!" });
        }
        const updatedKota = await Kota.findByIdAndUpdate(
            id,
            { nama_kota },
            { new: true }
        );
        if (!updatedKota) {
            return res.status(404).json({ success: false, message: "Kota tidak ditemukan!" });
        }
        res.status(200).json({ success: true, message: "Kota berhasil diperbarui!", updatedKota });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Hapus kota
export const delete_kota = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedKota = await Kota.findByIdAndDelete(id);
        if (!deletedKota) {
            return res.status(404).json({ success: false, message: "Kota tidak ditemukan!" });
        }
        res.status(200).json({ success: true, message: "Kota berhasil dihapus!", deletedKota });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
