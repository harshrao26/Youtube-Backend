import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js"
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

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body


    const user = await User.findById(req.user?._id)


    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(
            404,
            {},
            "Invalid User"
        )
    }

    console.log(user)

    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password Changed"
        ))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(new ApiResponse(200, req.user, "User details fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { username, fullname } = req.body

    if (!username || !fullname) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken ")

    return res.status(200)
        .json(new ApiResponse(200, user, "User details updated successfully"))

})

const changeAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Cover file is missing")
    }

    const newCover = await uploadOnCloudinary(avatarLocalPath)
    if (!newCover?.url) {
        throw new ApiError(400, "Avatar updation is failed")
    }


    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.avatarImg) {
        const deleteImg = await deleteOnCloudinary(user.avatarImg);
        if (!deleteImg.result === "ok") {
            throw new ApiError(400, "Failed to delete previous cover image from Cloudinary");
        }
    }


    const newUser = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: { coverImg: newCover.url }
        },
        {
            new: true
        }
    ).select("-password -refreshToken ")
    return res.status(200)
        .json(new ApiResponse(200, newUser, "User Avatar updated successfully"))

})

const changeCover = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    // Check if the file is provided
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload the new avatar image to Cloudinary
    const newAvatar = await uploadOnCloudinary(avatarLocalPath);
    if (!newAvatar?.url) {
        throw new ApiError(400, "Avatar updation failed");
    }

    // Find the user to get the previous cover image URL
    const user = await User.findById(req.user?.id).select("-password -refreshToken -coverImg");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Delete the old cover image from Cloudinary, if it exists
    if (user.coverImg) {
        const deleteImg = await deleteOnCloudinary(user.coverImg);
        if (!deleteImg.result === "ok") {
            throw new ApiError(400, "Failed to delete previous cover image from Cloudinary");
        }
    }

    // Update the user with the new avatar image

    const updatedUser = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: { avatrImg: newAvatar.url }
        },
        { new: true } // To return the updated user document
    ).select("-password -refreshToken");

    // Send the updated user response
    return res.status(200)
        .json(new ApiResponse(200, updatedUser, "User Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }

        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                forigenField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                forigenField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1,
                avatarImg: 1,
                coverImg: 1
            }
        }
    ])

    console.log(channel)

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                forigenField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            forigenField: "_id",
                            as: "owner",
                            pipeline: {
                                $project: {
                                    fullname: 1,
                                    username: 1,
                                    avatarImg: 1
                                }
                            }
                        },

                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }

                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History Fetched Successfully"))
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails, changeCover, changeAvatar, getUserChannelProfile, getWatchHistory }
