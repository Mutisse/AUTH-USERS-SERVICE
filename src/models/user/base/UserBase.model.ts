import mongoose, { Schema, Model } from "mongoose";
import {
  UserBase,
  UserMainRole,
  UserStatus,
  UserPreferences,
} from "../../interfaces/user.roles";

const PreferencesSchema = new Schema<UserPreferences>(
  {
    theme: { type: String, enum: ["light", "dark", "auto"], default: "light" },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    language: { type: String, default: "pt-MZ" },
    timezone: { type: String, default: "UTC" },
  },
  { _id: false }
);

// 🎯 SCHEMA CORRIGIDO com tipos explícitos
export const UserBaseSchema = new Schema<UserBase>(
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
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    preferences: {
      type: PreferencesSchema,
      default: () => ({
        theme: "light",
        notifications: {
          email: true,
          push: true,
          sms: false,
          whatsapp: false,
        },
        language: "pt-MZ",
        timezone: "UTC",
      }),
    },
    lastLogin: { type: Date, required: false },
    lastActivity: { type: Date, required: false },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    discriminatorKey: "role",
    collection: "users",
  }
);

export const UserBaseModel: Model<UserBase> = mongoose.model<UserBase>(
  "User",
  UserBaseSchema
);
