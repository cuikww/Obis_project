import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    lastLogin:{
        type: Date,
        default: Date.now
    },
    isVerified:{
        type:Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ["super-admin", "admin-po", "customer"],
        default: "customer",
    },
    po_bus:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Po_bus',
        default:null
    },

    resetPasswordToken : String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
}, {timestamps:true})

export const User = mongoose.model("User", userSchema)