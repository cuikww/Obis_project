import { Po_Bus } from "../models/po.model.js";
import bcryptjs from "bcryptjs";

export const addPO_Bus = async (req, res) => {
    const { nama_PO, secret_key } = req.body;

    try {

        if (!nama_PO || !secret_key) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const is_namaPO_alreadyExist = await Po_Bus.findOne({ nama_PO });
        if (is_namaPO_alreadyExist) {
            return res.status(400).json({ success: false, message: "nama_PO already exists" });
        }
        const hashed_secret_key = await bcryptjs.hash(secret_key, 10);

        const po_Bus = new Po_Bus({
            nama_PO,
            secret_key: hashed_secret_key,
        });

        await po_Bus.save();

        return res.status(201).json({
            success: true,
            message: "PO Bus created successfully",
            po_Bus: {
                ...po_Bus._doc,
                secret_key: undefined, // Jangan kirimkan secret_key dalam response
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const get_po_byID = async (req,res)=>{
    const {id_po} = req.params;
    try {
        const po_Bus = await Po_Bus.findById(id_po)
        if(!po_Bus){
            throw new Error ("PO bus tidak ditemukan!")
        }
        res.status(200).json({success:true, po_Bus})
    } catch (error) {
        res.status(400).json({success:false, message:error.message})
    }
}

export const deletePO = async (req,res)=>{
    const {id_po}= req.params;
    try {
        const po_Bus = await Po_Bus.findByIdAndDelete(id_po);
        if(!po_Bus){
            throw new Error("PO bus tidak ditemukan!")
        }
        res.status(400).json({success:true,message:"PO berhasil di hapus"})
    } catch (error) {
        res.status(400).json({success:false, message:error.message})
    }
}

export const editPO = async (req, res) => {
    const { id_po, nama_PO, secret_key } = req.body; // Data yang akan diperbarui

    try {
        // Periksa apakah semua field yang diperlukan disediakan
        if (!id_po || (!nama_PO && !secret_key)) {
            return res.status(400).json({
                success: false,
                message: "ID PO dan setidaknya salah satu field (nama_PO atau secret_key) diperlukan.",
            });
        }

        // Cari PO berdasarkan ID
        const po_Bus = await Po_Bus.findById(id_po);
        if (!po_Bus) {
            return res.status(404).json({ success: false, message: "PO Bus tidak ditemukan!" });
        }

        // Update nama_PO jika disediakan
        if (nama_PO) {
            const is_namaPO_alreadyExist = await Po_Bus.findOne({ nama_PO });
            if (is_namaPO_alreadyExist && is_namaPO_alreadyExist._id.toString() !== id_po) {
                return res.status(400).json({
                    success: false,
                    message: "Nama PO sudah ada, gunakan nama lain.",
                });
            }
            po_Bus.nama_PO = nama_PO;
        }

        // Update secret_key jika disediakan
        if (secret_key) {
            const hashed_secret_key = await bcryptjs.hash(secret_key, 10);
            po_Bus.secret_key = hashed_secret_key;
        }

        // Simpan perubahan ke database
        await po_Bus.save();

        res.status(200).json({
            success: true,
            message: "PO Bus berhasil diperbarui!",
            po_Bus: {
                ...po_Bus._doc,
                secret_key: undefined, // Jangan kirimkan secret_key dalam response
            },
        });
    } catch (error) {
        console.error("Error in editPO:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memperbarui PO Bus.",
        });
    }
};
