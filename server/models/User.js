const mongoose = require('mongoose');
const { decryptText, encryptText } = require('../utils/crypto');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    emailEncrypted: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'parent', 'teacher'],
        default: 'parent'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.methods.setEmail = function setEmail(email) {
    this.emailEncrypted = encryptText(email || '');
};

userSchema.methods.getEmail = function getEmail() {
    return decryptText(this.emailEncrypted || '');
};

const User = mongoose.model('User', userSchema);

module.exports = User;