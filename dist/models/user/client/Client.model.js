"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientModel = void 0;
const mongoose_1 = require("mongoose");
const UserBase_model_1 = require("../base/UserBase.model");
const user_roles_1 = require("../../interfaces/user.roles");
const ClientSchema = new mongoose_1.Schema({
    acceptTerms: {
        type: Boolean,
        required: true,
        default: false,
    },
    clientData: {
        preferences: {
            favoriteServices: [{ type: String }],
            preferredStylists: [{ type: String }],
            allergyNotes: { type: String, default: "" },
            specialRequirements: { type: String, default: "" },
        },
        loyaltyPoints: { type: Number, default: 0 },
        totalAppointments: { type: Number, default: 0 },
        lastVisit: { type: Date },
    },
});
exports.ClientModel = UserBase_model_1.UserBaseModel.discriminator(user_roles_1.UserMainRole.CLIENT, ClientSchema);
