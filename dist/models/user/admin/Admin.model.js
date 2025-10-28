"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModel = void 0;
const mongoose_1 = require("mongoose");
const UserBase_model_1 = require("../base/UserBase.model");
const user_roles_1 = require("../../interfaces/user.roles");
const AdminSchema = new mongoose_1.Schema({
    adminData: {
        permissions: {
            type: [String],
            default: ["users:read", "users:write", "system:stats", "system:config"],
        },
        accessLevel: {
            type: String,
            enum: ["full", "limited", "readonly"],
            default: "limited",
        },
        lastSystemAccess: { type: Date },
        managedUsers: { type: Number, default: 0 },
        systemNotifications: { type: Boolean, default: true },
    },
});
exports.AdminModel = UserBase_model_1.UserBaseModel.discriminator(user_roles_1.UserMainRole.ADMINSYSTEM, AdminSchema);
