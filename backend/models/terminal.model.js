import mongoose from "mongoose";

const terminalSchema = new mongoose.Schema({
    kota:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Kota"
    },
    nama_terminal:{
        type:String,
        required:true
    }
})
export const Terminal = mongoose.model("Terminal", terminalSchema)