import mongoose from 'mongoose'

const po_busSchema = new mongoose.Schema({
    nama_PO :{
        type:String,
        required:true,
        unique:true
    },
    secret_key:{
        type:String,
        required:true
    }

}, {timestamps:true})

export const Po_Bus = mongoose.model("Po_bus",po_busSchema)