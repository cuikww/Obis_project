import jwt from 'jsonwebtoken'

export const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if(!token) return res.status(401).json({success:false, message:"Unauthorized"})
    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        req.userId = decoded.userId
        next()
    } catch (error) {
        res.status(400).json({success:false, message:error.message})
        console.log("error in verifyToken ", error)
    }
}