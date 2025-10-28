// AUTH-USERS-SERVICE/src/models/user/Employee.model.ts
import { Schema, Document } from "mongoose";
import { UserBaseModel } from "../base/UserBase.model";
import { UserMainRole, EmployeeSubRole, EmployeeUser } from "../../interfaces/user.roles";

// 🎯 SCHEMA EMPLOYEE - APENAS DADOS ESPECÍFICOS
const EmployeeSchema = new Schema<EmployeeUser>(
  {
    employeeData: {
      subRole: {
        type: String,
        required: true,
        enum: Object.values(EmployeeSubRole),
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
  }
);

// 🎯 MODELO EMPLOYEE COMO DISCRIMINATOR
export const EmployeeModel = UserBaseModel.discriminator<EmployeeUser>(
  UserMainRole.EMPLOYEE,
  EmployeeSchema
);

// 🎯 EXPORTAR O TIPO DO DOCUMENTO
export type EmployeeDocument = Document<unknown, {}, EmployeeUser> & 
  EmployeeUser & { _id: string };