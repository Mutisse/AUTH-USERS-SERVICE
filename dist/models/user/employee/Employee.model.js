"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeModel = void 0;
const mongoose_1 = require("mongoose");
const UserBase_model_1 = require("../base/UserBase.model");
const user_roles_1 = require("../../interfaces/user.roles");
const EmployeeSchema = new mongoose_1.Schema({
    employeeData: {
        subRole: {
            type: String,
            required: true,
            enum: Object.values(user_roles_1.EmployeeSubRole),
        },
        professionalTitle: {
            type: String,
            required: true,
            trim: true,
            default: "Profissional de Beleza"
        },
        specialization: [{
                type: String,
                trim: true
            }],
        bio: {
            type: String,
            maxlength: 500,
            default: ""
        },
        experienceYears: {
            type: Number,
            default: 0
        },
        hireDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        salary: {
            type: Number
        },
        workSchedule: {
            monday: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "18:00" },
                available: { type: Boolean, default: true },
            },
            tuesday: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "18:00" },
                available: { type: Boolean, default: true },
            },
            wednesday: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "18:00" },
                available: { type: Boolean, default: true },
            },
            thursday: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "18:00" },
                available: { type: Boolean, default: true },
            },
            friday: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "18:00" },
                available: { type: Boolean, default: true },
            },
            saturday: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "14:00" },
                available: { type: Boolean, default: true },
            },
            sunday: {
                start: { type: String, default: "00:00" },
                end: { type: String, default: "00:00" },
                available: { type: Boolean, default: false },
            },
        },
        services: [{
                type: String
            }],
        rating: {
            average: {
                type: Number,
                default: 0,
                min: 0,
                max: 5
            },
            totalReviews: {
                type: Number,
                default: 0
            },
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
    },
});
exports.EmployeeModel = UserBase_model_1.UserBaseModel.discriminator(user_roles_1.UserMainRole.EMPLOYEE, EmployeeSchema);
