import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema({
    bus_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Bus'
    },
    seat_number:{
        type: Number,
        required:true
    }
},{timestamps:true})

export const Seat = mongoose.model("Seat",seatSchema)