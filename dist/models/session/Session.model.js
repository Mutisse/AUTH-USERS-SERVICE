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
exports.SessionModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SessionSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userRole: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    loginAt: { type: Date, required: true, default: Date.now },
    logoutAt: { type: Date },
    lastActivity: { type: Date, required: true, default: Date.now },
    status: {
        type: String,
        enum: ["online", "offline", "idle"],
        default: "online",
    },
    device: {
        type: {
            type: String,
            enum: ["mobile", "tablet", "desktop", "unknown"],
            default: "unknown",
        },
        browser: { type: String, default: "Unknown" },
        browserVersion: { type: String, default: "Unknown" },
        os: { type: String, default: "Unknown" },
        osVersion: { type: String, default: "Unknown" },
        platform: { type: String, default: "Unknown" },
    },
    location: {
        ip: { type: String, required: true },
        country: { type: String },
        city: { type: String },
        timezone: { type: String, default: "UTC" },
    },
    security: {
        userAgent: { type: String, required: true },
        isSecure: { type: Boolean, default: false },
        tokenVersion: { type: Number, default: 1 },
    },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    duration: { type: Number },
    activityCount: { type: Number, default: 0 },
}, {
    timestamps: true,
    collection: "sessions",
});
SessionSchema.index({ userId: 1, status: 1 });
SessionSchema.index({ loginAt: -1 });
SessionSchema.index({ "location.ip": 1 });
SessionSchema.index({ tokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
exports.SessionModel = mongoose_1.default.model("Session", SessionSchema);
