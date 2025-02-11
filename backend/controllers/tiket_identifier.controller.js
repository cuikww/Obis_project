import { Tiket_Identifier } from "../models/tiket_identifier.model.js";
import { v4 as uuidv4 } from 'uuid';

export const add_tiket_identifier = async (nama_bus, kota_keberangkatan, kota_tujuan) => {
    try {
        const identifier = `${uuidv4()}`;

        // Cek apakah identifier sudah ada untuk menghindari duplikasi
        let existingIdentifier = await Tiket_Identifier.findOne({ identifier });

        if (!existingIdentifier) {
            // Jika belum ada, buat identifier baru
            existingIdentifier = await Tiket_Identifier.create({ identifier });
        }

        return existingIdentifier;  // Mengembalikan identifier yang dibuat atau sudah ada
    } catch (error) {
        console.error("Error adding ticket identifier:", error);
        throw new Error("Failed to create ticket identifier");
    }
};
