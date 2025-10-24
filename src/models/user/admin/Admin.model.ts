// AUTH-USERS-SERVICE/src/models/user/Admin.model.ts
import { Schema } from "mongoose";
import { UserBaseModel } from "../base/UserBase.model";
import { UserMainRole, AdminUser } from "../../interfaces/user.roles"; // ✅ Agora AdminUser está exportado

// 🎯 SCHEMA ESPECÍFICO DO ADMIN (APENAS CAMPOS ÚNICOS)
const AdminSchema = new Schema<AdminUser>(
  {
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
  }
);

// 🎯 MODELO ADMIN COMO DISCRIMINATOR
export const AdminModel = UserBaseModel.discriminator<AdminUser>(
  UserMainRole.ADMINSYSTEM,
  AdminSchema
);