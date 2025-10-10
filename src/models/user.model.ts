import { Schema, model } from "mongoose";
import {
  UserDocument,
  UserMainRole,
  EmployeeSubRole,
  Gender,
} from "../models/interfaces/interfaces.user";
import generateCustomUserId from "../utils/generateCustomUserId";

// Schema de endereço aprimorado
const AddressSchema = new Schema(
  {
    country: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "Moçambique",
    },
    province: {
      type: String,
      trim: true,
      maxlength: 50,
      enum: [
        "Maputo",
        "Gaza",
        "Inhambane",
        "Sofala",
        "Manica",
        "Tete",
        "Zambézia",
        "Nampula",
        "Cabo Delgado",
        "Niassa",
      ],
      required: true,
    },
    city: { type: String, trim: true, maxlength: 50, required: true },
    district: { type: String, trim: true, maxlength: 50 },
    street: { type: String, trim: true, maxlength: 100 },
    houseNumber: { type: String, trim: true, maxlength: 20 },
    complement: { type: String, trim: true, maxlength: 100 },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (v: number[]) =>
            v.length === 2 &&
            v[0] >= -180 &&
            v[0] <= 180 &&
            v[1] >= -90 &&
            v[1] <= 90,
          message: "Coordenadas inválidas [longitude, latitude]",
        },
      },
    },
  },
  { _id: false }
);

// Schema de preferências expandido
const PreferencesSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    language: {
      type: String,
      enum: ["pt-MZ", "pt-PT", "en-US", "fr-FR"],
      default: "pt-MZ",
    },
    timezone: {
      type: String,
      default: "Africa/Maputo",
    },
    accessibility: {
      highContrast: { type: Boolean, default: false },
      fontSize: {
        type: Number,
        default: 14,
        min: 10,
        max: 24,
      },
      screenReader: { type: Boolean, default: false },
    },
    marketingPreferences: {
      receiveOffers: { type: Boolean, default: false },
      shareData: { type: Boolean, default: false },
    },
  },
  { _id: false, minimize: false }
);

// Schema principal aprimorado
const UserSchema = new Schema<UserDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    fullName: {
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
        maxlength: [50, "First name cannot exceed 50 characters"],
        match: [/^[a-zA-ZÀ-ÿ\s'-]+$/, "First name contains invalid characters"],
      },
      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
        maxlength: [50, "Last name cannot exceed 50 characters"],
        match: [/^[a-zA-ZÀ-ÿ\s'-]+$/, "Last name contains invalid characters"],
      },

      display: {
        type: String,
        trim: true,
        maxlength: 150,
        default: function () {
          return `${this.firstName} ${this.lastName}`.trim();
        },
      },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      minlength: [8, "Password must be at least 8 characters"],
    },
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Opcional
          // Valida números moçambicanos:83, 84, 85, 86, 87 + 7 dígitos
          return /^(\+?258)?\s?8[3-7][0-9]{7}$/.test(v);
        },
        message:
          "Número de telefone inválido. Use formato: 84|85|86|87 + 7 dígitos",
      },
      set: function (v: string) {
        if (!v) return v;
        // Normaliza o número: remove espaços e adquire o formato padrão
        return v.replace(/\s+/g, "").replace(/^(\+?258)?/, "+258");
      },
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(UserMainRole),
    },
    subRole: {
      type: String,
      required: function () {
        return this.role === UserMainRole.EMPLOYEE;
      },
      enum: Object.values(EmployeeSubRole),
      validate: {
        validator: function (subRole: string) {
          return (
            this.role !== UserMainRole.EMPLOYEE ||
            Object.values(EmployeeSubRole).includes(subRole as EmployeeSubRole)
          );
        },
        message: "Sub-role is required for employees",
      },
    },
    identification: {
      documentType: {
        type: String,
        enum: ["BI", "Passaporte", "DIRE", "Carta de Condução", "Outro"],
        default: null,
      },
      documentNumber: {
        type: String,
        trim: true,
        default: null,
        validate: {
          validator: function (v: string) {
            if (!v) return true; // Campo opcional
            // Validação para BI moçambicano (formato: 1234567L123)
            return /^[0-9]{7,9}[A-Za-z]{1}[0-9]{3}$/.test(v);
          },
          message:
            "Número de documento inválido (Formato esperado: 1234567L123)",
        },
      },
      issueDate: {
        type: Date,
        default: null,
      },
      expiryDate: {
        type: Date,
        default: null,
        validate: {
          validator: function (date: Date) {
            if (!date) return true;
            return date > new Date();
          },
          message: "Data de expiração deve ser futura",
        },
      },
      issuingAuthority: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      documentPhoto: {
        type: String,
        trim: true,
        default: null,
      },
    },
    verification: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      identity: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "pending",
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      default: Gender.PREFER_NOT_TO_SAY,
    },
    birthDate: {
      type: Date,
      default: null,
      validate: {
        validator: (date: Date) => !date || date < new Date(),
        message: "Birth date must be in the past",
      },
    },
    profileImage: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: AddressSchema,
      default: null,
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({}),
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPasswordChange: {
      type: Date,
      default: null,
    },
    passwordHistory: {
      type: [
        {
          password: String,
          changedAt: Date,
        },
      ],
      select: false,
      default: [],
    },
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
    },
    activityLog: {
      type: [
        {
          action: String,
          timestamp: { type: Date, default: Date.now },
          ipAddress: String,
          device: String,
        },
      ],
      select: false,
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.passwordHistory;
        delete ret.twoFactorAuth;
        delete ret.activityLog;
        delete ret.__v;
      },
    },
  }
);

// Índices geoespaciais para busca por localização
UserSchema.index({ "address.coordinates": "2dsphere" });

// Middleware para histórico de senhas
UserSchema.pre("save", function (next) {
  if (this.isModified("password")) {
    this.lastPasswordChange = new Date();
    this.passwordHistory.push({
      password: this.password,
      changedAt: new Date(),
    });

    // Mantém apenas os últimos 5 históricos
    if (this.passwordHistory.length > 5) {
      this.passwordHistory.shift();
    }
  }
  next();
});

// Virtual para verificar validade do documento
UserSchema.virtual("identification.isExpired").get(function () {
  return this.identification?.expiryDate
    ? this.identification.expiryDate < new Date()
    : null;
});

// Métodos estáticos
UserSchema.statics.findByLocation = function (
  province?: string,
  city?: string
) {
  return this.find({
    ...(province && { "address.province": province }),
    ...(city && { "address.city": city }),
  });
};

// Virtuals
UserSchema.virtual("age").get(function () {
  return this.birthDate
    ? Math.floor(
        (Date.now() - this.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;
});

export const UserModel = model<UserDocument>("User", UserSchema);
