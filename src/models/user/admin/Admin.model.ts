import mongoose, { Schema, Model } from "mongoose";
import {
  UserMainRole,
  UserStatus,
  UserPreferences,
} from "../../interfaces/user.roles";

// 🎯 INTERFACE ESPECÍFICA DO ADMIN
export interface AdminUser extends mongoose.Document {
  _id: string;
  email: string;
  password: string;
  role: UserMainRole;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;
  preferences: UserPreferences;

  // 🎯 CAMPOS ESPECÍFICOS DO ADMIN
  fullName: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  phoneNumber: string;
  birthDate?: Date;
  gender?: string;

  // 🎯 DADOS DE ADMINISTRAÇÃO
  adminData: {
    permissions: string[];
    accessLevel: "full" | "limited" | "readonly";
    lastSystemAccess?: Date;
    managedUsers: number;
    systemNotifications: boolean;
  };

  lastLogin?: Date;
  lastActivity?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

// 🎯 SCHEMA ESPECÍFICO DO ADMIN
const AdminSchema = new Schema<AdminUser>(
  {
    _id: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(UserMainRole),
      default: UserMainRole.ADMINSYSTEM,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true }, // Admin é verificado por padrão
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
      },
      language: { type: String, default: "pt-MZ" },
      timezone: { type: String, default: "UTC" },
    },

    // 🎯 DADOS PESSOAIS
    fullName: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      displayName: { type: String, required: true, trim: true },
    },
    phoneNumber: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"], trim: true },

    // 🎯 DADOS DE ADMIN
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

    lastLogin: { type: Date },
    lastActivity: { type: Date },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// ✅ MODELO SEPARADO SEM DISCRIMINATOR
export const AdminModel: Model<AdminUser> = mongoose.model<AdminUser>(
  "Admin",
  AdminSchema
);
