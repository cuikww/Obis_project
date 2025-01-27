import mongoose from 'mongoose'

const kotaSchema = new mongoose.Schema({
    nama_kota:{
        type:String,
        required:true
    }
})

export const Kota = mongoose.model("Kota",kotaSchema)