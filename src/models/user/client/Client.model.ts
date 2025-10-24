// AUTH-USERS-SERVICE/src/models/user/Client.model.ts
import { Schema } from "mongoose";
import { UserBaseModel } from "../base/UserBase.model";
import { UserMainRole, ClientUser } from "../../interfaces/user.roles";

// 🎯 SCHEMA CLIENT - APENAS DADOS ESPECÍFICOS
const ClientSchema = new Schema<ClientUser>({
  acceptTerms: {
    type: Boolean,
    required: true,
    default: false,
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
});

// 🎯 MODELO CLIENT COMO DISCRIMINATOR
export const ClientModel = UserBaseModel.discriminator<ClientUser>(
  UserMainRole.CLIENT,
  ClientSchema
);
