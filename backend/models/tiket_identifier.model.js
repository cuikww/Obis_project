import mongoose from "mongoose";

const ticket_identifier_schema = new mongoose.Schema({
    identifier:{
        type:String,
        required:true
    }
}, {timestamps:true})
export const Tiket_Identifier = mongoose.model("Tiket_Identifier", ticket_identifier_schema)