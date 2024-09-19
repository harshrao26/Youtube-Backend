import mongoose, { Schema } from 'mongoose'

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
    coverImg:{
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

export const User = mongoose.model("User", UserSchema)