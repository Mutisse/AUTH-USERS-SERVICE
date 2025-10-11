import { Document, Types } from "mongoose";

export enum UserMainRole {
  CLIENT = "client",
  EMPLOYEE = "employee",
  ADMINSYSTEM = "admin_system",
}

export enum EmployeeSubRole {
  SALON_OWNER = "salon_owner",
  MANAGER = "manager",
  STAFF = "staff",
  RECEPTIONIST = "receptionist",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
}

export type Role = UserMainRole;

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  language: string;
  timezone: string;
}

// 🎯 INTERFACE CORRIGIDA para compatibilidade com Mongoose
export interface UserBase extends Document {
  _id: string;
  email: string;
  password: string;
  role: UserMainRole;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;
  preferences: UserPreferences;
  lastLogin?: Date;
  lastActivity?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}
