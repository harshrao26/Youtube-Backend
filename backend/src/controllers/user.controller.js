import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { User } from '../model/user.model.js'

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, fullname, password } = req.body
    if (username === "" || email === "" || fullname === "" || password === "") {
        throw ApiError(400, "All fields are required")
    }

    const existingUser = User.findOne({
        $or: [{ email }, { username }]
    })
    if (!existingUser) {
        throw ApiError(400, "User is already exists")

    }

    console.log(req.files);

    const avtarLocalFilePath = req.files?.avatar[0]?.path
    const coverImgLocalFilePath = req.files?.coverImg[0]?.path

    const avatar = await uploadOnCloudinary(avtarLocalFilePath)
    const coverImg = await uploadOnCloudinary(coverImgLocalFilePath)

    const user = await User.create({
        username, 
        email, 
        fullname,
        password,
        avatarImg: avatar.url || "" ,
        coverImg: coverImg.url || ""

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken "
    )

    if(!createdUser){
        throw ApiError(500, "Something went wrong")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully"  )
    )

    






})






export { registerUser }
