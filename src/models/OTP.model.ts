// src/models/OTP.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  code: string;
  purpose:
    | "registration"
    | "password-recovery"
    | "login"
    | "email-verification";
  attempts: number;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  usedAt?: Date;
}

const OTPSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 6,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        "registration",
        "password-recovery",
        "login",
        "email-verification",
      ],
      default: "registration",
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índice TTL para expiração automática
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Índice composto para buscas eficientes
OTPSchema.index({ email: 1, purpose: 1, verified: 1 });

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
