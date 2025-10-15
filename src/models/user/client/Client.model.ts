import mongoose, { Schema, Model, Document } from "mongoose";
import {
  UserMainRole,
  UserStatus,
  UserPreferences,
} from "../../interfaces/user.roles";

// 🎯 INTERFACE CLIENTE SIMPLIFICADA
export interface ClientUser extends Document {
  _id: string;
  email: string;
  password: string;
  role: UserMainRole;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
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
  acceptTerms: boolean;
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
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
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
    acceptTerms: { type: Boolean, required: true, default: false },
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

// 🆕 MIDDLEWARE PARA EXCLUSÃO LÓGICA - VERSÃO SIMPLIFICADA
ClientSchema.pre(/^find/, function (this: any, next) {
  // Excluir documentos marcados como deletados das consultas normais
  if (this.getOptions().includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// 🆕 MÉTODO ESTÁTICO PARA INCLUIR DELETADOS
ClientSchema.statics.includeDeleted = function () {
  return this.find().setOptions({ includeDeleted: true });
};

// 🆕 MÉTODO ESTÁTICO PARA BUSCAR POR ID INCLUINDO DELETADOS
ClientSchema.statics.findByIdIncludeDeleted = function (id: string) {
  return this.findOne({ _id: id }).setOptions({ includeDeleted: true });
};

// 🆕 MÉTODO PARA EXCLUSÃO LÓGICA
ClientSchema.methods.softDelete = function (deletedBy?: string) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.isActive = false;
  this.status = UserStatus.INACTIVE;
  return this.save();
};

// 🆕 MÉTODO PARA RESTAURAR
ClientSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.isActive = true;
  this.status = UserStatus.ACTIVE;
  return this.save();
};

// 🎯 INTERFACE PARA MÉTODOS ESTÁTICOS
interface ClientModelStatic extends Model<ClientUser> {
  includeDeleted(): mongoose.Query<any, ClientUser>;
  findByIdIncludeDeleted(id: string): mongoose.Query<any, ClientUser>;
}

// 🎯 MODELO CORRIGIDO
export const ClientModel = mongoose.model<ClientUser, ClientModelStatic>(
  "Client",
  ClientSchema
);
