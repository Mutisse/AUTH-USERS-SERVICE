import mongoose, { Schema, Model } from "mongoose";
import { Session } from "../interfaces/session.interface";

const SessionSchema = new Schema<Session>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userRole: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },

    // 🎯 INFORMAÇÕES DE LOGIN
    loginAt: { type: Date, required: true, default: Date.now },
    logoutAt: { type: Date },
    lastActivity: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["online", "offline", "idle"],
      default: "online",
    },

    // 🎯 INFORMAÇÕES DO DISPOSITIVO
    device: {
      type: {
        type: String,
        enum: ["mobile", "tablet", "desktop", "unknown"],
        default: "unknown",
      },
      browser: { type: String, default: "Unknown" },
      browserVersion: { type: String, default: "Unknown" },
      os: { type: String, default: "Unknown" },
      osVersion: { type: String, default: "Unknown" },
      platform: { type: String, default: "Unknown" },
    },

    // 🎯 INFORMAÇÕES DE LOCALIZAÇÃO
    location: {
      ip: { type: String, required: true },
      country: { type: String },
      city: { type: String },
      timezone: { type: String, default: "UTC" },
    },

    // 🎯 INFORMAÇÕES DE SEGURANÇA
    security: {
      userAgent: { type: String, required: true },
      isSecure: { type: Boolean, default: false },
      tokenVersion: { type: Number, default: 1 },
    },

    // 🎯 TOKENS
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },

    // 🎯 MÉTRICAS
    duration: { type: Number }, // em minutos
    activityCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "sessions",
  }
);

// 🎯 ÍNDICES PARA PERFORMANCE
SessionSchema.index({ userId: 1, status: 1 });
SessionSchema.index({ loginAt: -1 });
SessionSchema.index({ "location.ip": 1 });
SessionSchema.index({ tokenExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL para tokens expirados

export const SessionModel: Model<Session> = mongoose.model<Session>(
  "Session",
  SessionSchema
);
