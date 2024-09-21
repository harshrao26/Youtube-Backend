import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { User } from '../model/user.model.js'
import jwt from 'jsonwebtoken'
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        // console.log("Instance User: ", user)

        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        // Log the actual error for debugging purposes
        console.error("Error in generating tokens:", error.message);

        throw new ApiError(500, "Access & Refresh Token Generation Error")

    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { username, email, fullname, password } = req.body
    if (username === "" || email === "" || fullname === "" || password === "") {
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = User.findOne({
        $or: [{ email }, { username }]
    })

    if (!existingUser) {
        throw new ApiError(400, "User is already exists")

    }

    // console.log(req.files);

    const avtarLocalFilePath = req.files?.avatar[0]?.path
    const coverImgLocalFilePath = req.files?.coverImg[0]?.path

    const avatar = await uploadOnCloudinary(avtarLocalFilePath)
    const coverImg = await uploadOnCloudinary(coverImgLocalFilePath)

    const user = await User.create({
        username,
        email,
        fullname,
        password,
        avatarImg: avatar.url || "",
        coverImg: coverImg.url || ""

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken "
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
})


const loginUser = asyncHandler(async (req, res) => {
    // console.log("Request Headers:", req.headers);
    // console.log("Request Type:", req.method);
    // console.log("Content-Type:", req.headers['content-type']);
    // console.log("Request Body:", req.body);

    const { username, email, password } = req.body
    console.log(req.body); // Log to check incoming data

    if (username === "" || email === "" || password === "") {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "User not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    console.log("Password Valid:", isPasswordValid); // Log password validity check

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Passwod")
    }

    console.log("User Info:", user)
    const { accessToken, refreshToken } = generateAccessAndRefreshToken(user?._id)

    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);

    const loggedInUser = await (User.findById(user._id)).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .sendStatus(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)

        // Returning sensitive information like access tokens, refresh tokens, and user details in a JSON response can pose security risks, especially if not handled properly.Here are some considerations:

        // Access Token Exposure:
        // Risk: If the access token is exposed, it can be used by malicious actors to authenticate as the user.
        // Mitigation: Instead of sending the access token back in the JSON response, consider just sending the user details or a success message.The access token should ideally be stored in an HttpOnly cookie.

        // Refresh Token Exposure:
        // Risk: Exposing the refresh token can lead to session hijacking.If an attacker gains access to the refresh token, they can obtain new access tokens indefinitely.
        // Mitigation: Similar to the access token, avoid sending the refresh token in the JSON response.Use secure, HttpOnly cookies to store it.

        // .json(
        //     new ApiResponse(
        //         200,
        //         {
        //             user: accessToken, refreshToken, loggedInUser
        //         },
        //         "User Logged In Successfully"
        //     )
        // )

        .json({
            status: 200,
            loggedInUser: {
                username: loggedInUser.username,
                fullname: loggedInUser.fullname,
            },
            message: "Login successful!",
        });

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .send(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request (Invalid User's Token)")
    }

    console.log(incomingRefreshToken)

    try {
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        console.log(decodedToken)

        const user = await User.findById(decodedToken?._id)

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(
                401,
                "Refresh Token is Expired"
            )
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        res.send(200)
            .cookies("accessToken", accessToken, options)
            .cookies("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Access Token Refreshed"
                )
            )

    } catch (error) {
        console.error("Error in refreshing access token:", error)
        throw new ApiError(
            401,
            "Error in refreshing access token!!"

        )

    }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken }
