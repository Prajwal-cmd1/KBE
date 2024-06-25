import { hash } from "bcrypt";
import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        select: false,
        required: true
    },
    avatar: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
    }
}, {
    timestamps: true
});

//hash psswd before save 
userSchema.pre("save", async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await hash(this.password, 10);
    next();
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
