const mongoose = require("mongoose");
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true // Ensures no two users can register with the same email
    },
    username: {
        type: String,
        required: true,
        unique: true // Ensures usernames are unique
    },
    role: {
        type: String,
        enum: ['End-User', 'Support Agent', 'Admin'], // Restricts role to these values
        default: 'End-User'
    }
});
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

module.exports = User;