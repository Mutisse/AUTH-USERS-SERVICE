import mongoose, { Schema, Document } from "mongoose";

export interface IVerifiedEmail extends Document {
  email: string;
  purpose: "registration" | "password_reset" | "email_change";
  isVerified: boolean;
  verifiedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerifiedEmailSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["registration", "password_reset", "email_change"],
      default: "registration",
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    },
  },
  {
    timestamps: true,
  }
);

// Índice para buscar verificações válidas rapidamente
VerifiedEmailSchema.index({
  email: 1,
  purpose: 1,
  isVerified: 1,
  expiresAt: 1,
});

// Índice TTL para limpar automaticamente após expiração
VerifiedEmailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerifiedEmailModel = mongoose.model<IVerifiedEmail>(
  "VerifiedEmail",
  VerifiedEmailSchema
);
