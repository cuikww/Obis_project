import express from "express";
import { signup, login, logout, verifyEmail, forgotPassword, resetPassword, checkAuth, SuperAdminLogin, admin_po_register, admin_po_login} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
const router = express.Router();

router.get("/check-auth", verifyToken, checkAuth)

router.post("/signup", signup);
router.post("/signup-admin-po", admin_po_register);
router.post("/login", login);
router.post("/logout",logout);
router.post("/verify-email",verifyEmail);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password/:token",resetPassword);
router.post("/superAdmin-login", SuperAdminLogin);
router.post("/admin-po-login", admin_po_login)
export default router;
