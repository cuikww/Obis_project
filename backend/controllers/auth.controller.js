import bcryptjs from 'bcryptjs'
import crypto from 'crypto'

import {User} from '../models/user.model.js'
import {generateTokenAndSetCookie} from '../utils/generateTokenAndSetCookie.js'
import {sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail} from '../mailtrap/emails.js'
import { Po_Bus } from '../models/po.model.js'

export const signup = async(req, res) => {
    const {email, password, name} = req.body
    try{
        if(!email || !password|| !name){
            throw new Error("All fields are required")
        }
        const userAlreadyExist = await User.findOne({email})
        if (userAlreadyExist){
            return res.status(400).json({succes:false,message: "User already exist"})
        }

        const hashedPassword = await bcryptjs.hash(password, 10);
        const verificationToken = Math.floor(100000+Math.random()*900000).toString();

        const user = new User({
            email,
            password:hashedPassword,
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 *60 *60*1000//24 jam
        })
        await user.save()

        //jwt
        generateTokenAndSetCookie(res, user._id)

        await sendVerificationEmail(user.email, verificationToken);

        res.status(201).json({success:true, message:"User created successfully", user:{
            ...user._doc, password:undefined
        }})

    }catch (error){
        res.status(400).json({success:false, message : error.message})
    }
}
export const verifyEmail = async (req, res) => {
	const { code } = req.body;
	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		await sendWelcomeEmail(user.email, user.name);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("error in verifyEmail ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};
export const login = async(req, res) => {
    const {email, password}= req.body;
    try{
        const user = await User.findOne({email})
        if(!user || user.role != "customer"){
            throw new Error("User not found")
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password)
        if(!isPasswordValid){
            throw new Error("Invalid credentials")
        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();

        await user.save();

        res.status(200).json({
            success:true,
            message:"Login successful",
            user:{
                ...user._doc, password:undefined}
        })
    }catch (error){
        res.status(400).json({success:false, message : error.message})
    }
}
export const logout = async(req, res) => {
    res.clearCookie("token")
    res.send("Logout route")
}
export const forgotPassword = async(req, res) =>{
    const {email}= req.body;
    try{
        const user = await User.findOne({email})
        if(!user){
            throw new Error("User not found")
        }
        const resetPasswordToken = crypto.randomBytes(20).toString('hex');
        const resetPasswordExpiresAt = Date.now() + 1 *60 *60*1000//1 jam

        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpiresAt = resetPasswordExpiresAt;

        await user.save();

        await sendPasswordResetEmail(user.email, process.env.CLIENT_URL + `/reset-password/${resetPasswordToken}`);
        res.status(200).json({success:true, message:"Password reset email sent successfully"})

    }catch(error){
        res.status(400).json({success:false, message : error.message})
        console.log("error in forgotPassword",error)
    }
}
export const resetPassword = async(req, res) =>{
    const{token} = req.params;
    const {password} = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        })
        if(!user){
            throw new Error("Invalid or expired reset password token")
        }
        const hashedPassword = await bcryptjs.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;

        await user.save();
        await sendResetSuccessEmail(user.email);
        res.status(200).json({success:true, message:"Password reset successfully"})
    } catch (error) {
        
    }
}
export const checkAuth = async(req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password")
        if(!user){
            throw new Error("User not found")
        }
        res.status(200).json({success:true, user})
    } catch (error) {
        res.status(400).json({success:false, message:error.message})
        console.log("error in checkAuth", error)
    }
}

export const SuperAdminLogin = async(req, res) => {
    const {email, password}= req.body;
    try{
        const user = await User.findOne({email})
        if(!user || user.role != "super-admin"){
            throw new Error("User not found")
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password)
        if(!isPasswordValid){
            throw new Error("Invalid credentials")
        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();

        await user.save();

        res.status(200).json({
            success:true,
            message:"Login successful",
            user:{
                ...user._doc, password:undefined}
        })
    }catch (error){
        res.status(400).json({success:false, message : error.message})
    }
}

export const admin_po_register = async (req, res) => {
    const { email, password, name, id_po, secret_key } = req.body;
    try {
        if (!email || !password || !name || !id_po || !secret_key) {
            throw new Error("All fields are required");
        }

        const userAlreadyExist = await User.findOne({ email });
        if (userAlreadyExist) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const po_bus = await Po_Bus.findById(id_po);
        if (!po_bus) {
            throw new Error("PO bus tidak ditemukan!");
        }

        const isSecretKeyValid = await bcryptjs.compare(secret_key, po_bus.secret_key);
        if (!isSecretKeyValid) {
            throw new Error("Secret Key Anda Salah!");
        }

        const hashedPassword = await bcryptjs.hash(password, 10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        const user = new User({
            email,
            password: hashedPassword,
            name,
            role: "admin-po",
            po_bus:id_po,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 jam
        });
        await user.save();

        // jwt
        generateTokenAndSetCookie(res, user._id);

        await sendVerificationEmail(user.email, verificationToken);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const admin_po_login = async(req, res) => {
    const {email, password}= req.body;
    try{
        const user = await User.findOne({email})
        if(!user || user.role != "admin-po"){
            throw new Error("User not found")
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password)
        if(!isPasswordValid){
            throw new Error("Invalid credentials")
        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();

        await user.save();

        res.status(200).json({
            success:true,
            message:"Login successful",
            user:{
                ...user._doc, password:undefined}
        })
    }catch (error){
        res.status(400).json({success:false, message : error.message})
    }
}

// Update user name, password, or both
export const updateUser = async (req, res) => {
    try {
        const { name, password } = req.body;
        const userId = req.userId; // From verifyToken middleware

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if at least one field is provided
        if (!name && !password) {
            return res.status(400).json({ success: false, message: 'At least one field (name or password) is required' });
        }

        // Update name if provided
        if (name) {
            user.name = name;
        }

        // Update password if provided
        if (password) {
            const hashedPassword = await bcryptjs.hash(password, 10);
            user.password = hashedPassword;
        }

        // Save updated user
        await user.save();

        // Respond with updated user (excluding password)
        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Server error while updating user' });
    }
};