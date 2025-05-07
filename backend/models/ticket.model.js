import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    waktu_keberangkatan: {
        type: Date,
        required: true
    },
    harga: {
        type: Number,
        required: true
    },
    terminal_keberangkatan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Terminal', // Reference to Terminal model
        required: true
    },
    terminal_tujuan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Terminal', // Reference to Terminal model
        required: true
    },
    id_kursi: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seat',
        required: true
    },
    status_tiket: {
        type: String,
        enum: ['tersedia', 'habis'],
        default: 'tersedia',
        required: true
    },
    batch_id: {
        type: String,
        required: true,
        index: true
    }
}, { timestamps: true });

export const Ticket = mongoose.model('Ticket', ticketSchema);