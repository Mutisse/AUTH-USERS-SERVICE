"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserBaseModel = exports.UserBaseSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const user_roles_1 = require("../../interfaces/user.roles");
const PreferencesSchema = new mongoose_1.Schema({
    theme: { type: String, enum: ["light", "dark", "auto"], default: "light" },
    notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
    },
    language: { type: String, default: "pt-MZ" },
    timezone: { type: String, default: "UTC" },
}, { _id: false });
exports.UserBaseSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    fullName: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        displayName: { type: String, required: true, trim: true },
    },
    phoneNumber: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        trim: true
    },
    profileImage: { type: String },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true },
    },
    role: {
        type: String,
        required: true,
        enum: Object.values(user_roles_1.UserMainRole)
    },
    status: {
        type: String,
        enum: Object.values(user_roles_1.UserStatus),
        default: user_roles_1.UserStatus.PENDING_VERIFICATION
    },
    isActive: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    emailVerifiedAt: { type: Date },
    preferences: {
        type: PreferencesSchema,
        default: () => ({
            theme: "light",
            notifications: {
                email: true,
                push: true,
                sms: false,
                whatsapp: false
            },
            language: "pt-MZ",
            timezone: "UTC",
        }),
    },
    lastLogin: { type: Date },
    lastActivity: { type: Date },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
}, {
    timestamps: true,
    discriminatorKey: "role",
    collection: "users",
});
exports.UserBaseSchema.pre(/^find/, function (next) {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});
exports.UserBaseSchema.statics.includeDeleted = function () {
    return this.find().setOptions({ includeDeleted: true });
};
exports.UserBaseSchema.statics.findByIdIncludeDeleted = function (id) {
    return this.findOne({ _id: id }).setOptions({ includeDeleted: true });
};
exports.UserBaseSchema.methods.softDelete = function (deletedBy) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.isActive = false;
    this.status = user_roles_1.UserStatus.DELETED;
    return this.save();
};
exports.UserBaseSchema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.isActive = true;
    this.status = user_roles_1.UserStatus.ACTIVE;
    return this.save();
};
exports.UserBaseSchema.methods.verifyEmail = function () {
    this.isVerified = true;
    this.emailVerifiedAt = new Date();
    this.status = user_roles_1.UserStatus.VERIFIED;
    this.isActive = true;
    return this.save();
};
exports.UserBaseSchema.methods.activateAccount = function () {
    this.isActive = true;
    this.isVerified = true;
    this.status = user_roles_1.UserStatus.ACTIVE;
    return this.save();
};
exports.UserBaseModel = mongoose_1.default.model("User", exports.UserBaseSchema);
