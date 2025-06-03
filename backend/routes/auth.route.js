import express from "express";
import { signup, login, logout, verifyEmail, forgotPassword, resetPassword, checkAuth, SuperAdminLogin, admin_po_register, admin_po_login} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
const router = express.Router();

router.get("/check-auth", verifyToken, checkAuth)


router.post("/logout",logout);
router.post("/verify-email",verifyEmail);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password/:token",resetPassword);

//sign up
router.post("/customer/signup", signup); 
router.post("/admin-po/signup", admin_po_register);


//Login
router.post("/customer/login", login);
router.post("/admin-po/login", admin_po_login) 
router.post("/super-admin/login", SuperAdminLogin);

router.patch('/update', verifyToken, updateUser);

export default router;
