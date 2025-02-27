import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import dotenv from "dotenv"
import User from "../models/user.model.js"
dotenv.config()
import jwt from "jsonwebtoken"
export const verifyJWT = asyncHandler(async(req,res,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token)throw new ApiError(401,"Unauthorized request")
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const decodedUser = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!decodedUser) throw new ApiError(401, "Invalid access token")
        req.user = decodedUser;
        next()
    } catch (error) {
        throw new ApiError(401,"Invalid access token")
    }
    
})

