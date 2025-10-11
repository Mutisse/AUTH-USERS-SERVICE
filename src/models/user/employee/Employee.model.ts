import mongoose, { Schema } from "mongoose";
import { UserBaseModel } from "../base/UserBase.model"; // ✅ Importar o MODEL, não o Schema
import { UserMainRole, EmployeeSubRole } from "../../interfaces/user.roles";

// 🎯 INTERFACE ESPECÍFICA DO EMPLOYEE
export interface EmployeeUser extends mongoose.Document {
  // 🎯 CAMPOS ESPECÍFICOS DO EMPLOYEE
  fullName: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  phoneNumber: string;
  birthDate?: Date;
  gender?: string;

  // 🎯 DADOS PROFISSIONAIS
  employeeData: {
    subRole: EmployeeSubRole;
    professionalTitle: string;
    specialization?: string[];
    bio?: string;
    experienceYears: number;
    hireDate: Date;
    salary?: number;
    workSchedule: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    services: string[]; // IDs dos serviços que oferece
    rating: {
      average: number;
      totalReviews: number;
    };
    isAvailable: boolean;
  };
}

// 🎯 SCHEMA ESPECÍFICO DO EMPLOYEE
const EmployeeSchema = new Schema<EmployeeUser>({
  // 🎯 DADOS PESSOAIS
  fullName: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
  },
  phoneNumber: { type: String, required: true, trim: true },
  birthDate: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"], trim: true },

  // 🎯 DADOS PROFISSIONAIS
  employeeData: {
    subRole: {
      type: String,
      required: true,
      enum: Object.values(EmployeeSubRole),
    },
    professionalTitle: { type: String, required: true, trim: true },
    specialization: [{ type: String, trim: true }],
    bio: { type: String, maxlength: 500 },
    experienceYears: { type: Number, default: 0 },
    hireDate: { type: Date, required: true, default: Date.now },
    salary: { type: Number },
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
    services: [{ type: String }], // IDs dos serviços
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0 },
    },
    isAvailable: { type: Boolean, default: true },
  },
});

// ✅ CORREÇÃO: Criar o discriminator usando UserBaseModel (que é um Model)
export const EmployeeModel = UserBaseModel.discriminator<EmployeeUser>(
  UserMainRole.EMPLOYEE,
  EmployeeSchema
);