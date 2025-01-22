import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
    po_bus:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Po_bus'
    },
    nama_bus:{
        type:String,
        required:true,
        unique:true
    },
    kapasitas:{
        type: Number,
        required:true
    }
}, {timestamps:true})

export const Bus = mongoose.model("Bus", busSchema);