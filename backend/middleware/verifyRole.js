import jwt from 'jsonwebtoken'
import { User } from "../models/user.model.js";

export const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
  
        // Dapatkan user dari database untuk memeriksa role
        User.findById(req.userId)
          .then((user) => {
            if (!user || !allowedRoles.includes(user.role)) {
              return res.status(403).json({ success: false, message: "Forbidden" });
            }
            next();
          })
          .catch((err) => {
            res.status(500).json({ success: false, message: "Server error" });
          });
      } catch (error) {
        res.status(400).json({ success: false, message: "Invalid token" });
      }
    };
  };
  