import mongoose, { Schema } from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
import bcrypt from "bcrypt"
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

const UserSchema = new Schema({
    username: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    avatarImg: {
        type: String
    },
    coverImg: {
        type: String
    },
    watchHistory:
        [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],

    password: {
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
})

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()

})

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        fullname: this.fullname,
        email: this.email,
        username: this.username
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id,
    },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", UserSchema)