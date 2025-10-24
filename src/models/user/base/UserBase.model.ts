// AUTH-USERS-SERVICE/src/models/base/UserBase.model.ts
import mongoose, { Schema, Model, Query } from "mongoose";
import {
  UserBase,
  UserMainRole,
  UserStatus,
  UserPreferences,
  UserBaseMethods,
  UserBaseModelStatic
} from "../../interfaces/user.roles";

// 🎯 SCHEMA DE PREFERÊNCIAS
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

// 🎯 SCHEMA BASE COMPLETO
export const UserBaseSchema = new Schema<UserBase, UserBaseModelStatic, UserBaseMethods>(
  {
    // ✅ DADOS BÁSICOS (COMUNS A TODOS)
    _id: { type: String, required: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password: { 
      type: String, 
      required: true, 
      select: false 
    },
    
    // ✅ DADOS PESSOAIS (COMUNS A TODOS)
    fullName: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      displayName: { type: String, required: true, trim: true },
    },
    phoneNumber: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    gender: { 
      type: String, 
      enum: ["male", "female", "other"], 
      trim: true 
    },
    profileImage: { type: String },
    
    // ✅ ENDEREÇO (COMUM A TODOS)
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    
    // ✅ AUTENTICAÇÃO & STATUS
    role: { 
      type: String, 
      required: true, 
      enum: Object.values(UserMainRole) 
    },
    status: { 
      type: String, 
      enum: Object.values(UserStatus), 
      default: UserStatus.PENDING_VERIFICATION 
    },
    isActive: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    
    // ✅ SOFT DELETE
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    emailVerifiedAt: { type: Date },
    
    // ✅ PREFERÊNCIAS
    preferences: {
      type: PreferencesSchema,
      default: () => ({
        theme: "light",
        notifications: { 
          email: true, 
          push: true, 
          sms: false, 
          whatsapp: false 
        },
        language: "pt-MZ",
        timezone: "UTC",
      }),
    },
    
    // ✅ ATIVIDADE
    lastLogin: { type: Date },
    lastActivity: { type: Date },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    discriminatorKey: "role",
    collection: "users",
  }
);

// 🎯 MIDDLEWARE - SOFT DELETE
UserBaseSchema.pre(/^find/, function (this: any, next) {
  if (this.getOptions().includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// 🎯 MÉTODOS ESTÁTICOS
UserBaseSchema.statics.includeDeleted = function () {
  return this.find().setOptions({ includeDeleted: true });
};

UserBaseSchema.statics.findByIdIncludeDeleted = function (id: string) {
  return this.findOne({ _id: id }).setOptions({ includeDeleted: true });
};

// 🎯 MÉTODOS DE INSTÂNCIA
UserBaseSchema.methods.softDelete = function (deletedBy?: string) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.isActive = false;
  this.status = UserStatus.DELETED;
  return this.save();
};

UserBaseSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.isActive = true;
  this.status = UserStatus.ACTIVE;
  return this.save();
};

UserBaseSchema.methods.verifyEmail = function () {
  this.isVerified = true;
  this.emailVerifiedAt = new Date();
  this.status = UserStatus.VERIFIED;
  this.isActive = true;
  return this.save();
};

UserBaseSchema.methods.activateAccount = function () {
  this.isActive = true;
  this.isVerified = true;
  this.status = UserStatus.ACTIVE;
  return this.save();
};

// 🎯 MODELO BASE
export const UserBaseModel = mongoose.model<UserBase, UserBaseModelStatic>(
  "User",
  UserBaseSchema
);