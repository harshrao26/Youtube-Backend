import { Router } from "express"
import { registerUser, loginUser, logoutUser, refreshAccessToken, getCurrentUser, changePassword, updateAccountDetails, changeAvatar, changeCover, getUserChannelProfile, getWatchHistory } from '../controllers/user.controller.js'
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from '../middlewares/auth.middleware.js'
const router = Router()

router.route("/register").post(
    upload.fields([{
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImg",
        maxCount: 1
    }
    ]), registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-user-details").patch(verifyJWT, updateAccountDetails)
router.route("/update-user-avatar").patch(verifyJWT, upload.single('avatarImg'), changeAvatar)
router.route("/update-user-coverimage").patch(verifyJWT, upload.single('coverImg'), changeCover)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)



export default router