import mongoose, { Schema, Model, Document } from "mongoose";
import {
  UserMainRole,
  UserStatus,
  UserPreferences,
} from "../../interfaces/user.roles";

// 🎯 INTERFACE CLIENTE CORRIGIDA
export interface ClientUser extends Document {
  _id: string;
  email: string;
  password: string;
  role: UserMainRole;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;
  fullName: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  phoneNumber?: string;
  birthDate?: Date;
  gender?: "male" | "female" | "other";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  clientData: {
    preferences: {
      favoriteServices?: string[];
      preferredStylists?: string[];
      allergyNotes?: string;
      specialRequirements?: string;
    };
    loyaltyPoints: number;
    totalAppointments: number;
    lastVisit?: Date;
  };
  preferences: UserPreferences;
  lastLogin?: Date;
  lastActivity?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientSchema = new Schema<ClientUser>(
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
      default: UserMainRole.CLIENT,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    fullName: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, default: "", trim: true },
      displayName: { type: String, required: true, trim: true },
    },
    phoneNumber: { type: String, trim: true },
    birthDate: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"], trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
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

// 🎯 MODELO CORRIGIDO
export const ClientModel: Model<ClientUser> = mongoose.model<ClientUser>(
  "Client",
  ClientSchema
);
