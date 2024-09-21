import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js"

const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authentication")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unexpected Token")
        }
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Invalid Token")

        }
        req.user = user
        next()

    } catch (error) {
        throw new ApiError(401, "Invalid Access Token")
    }

})

export {verifyJWT}