// AUTH-USERS-SERVICE/src/models/interfaces/user.roles.ts
import { Document, Types, Model, Query } from "mongoose";

export enum UserMainRole {
  CLIENT = "client",
  EMPLOYEE = "employee",
  ADMINSYSTEM = "admin_system",
}

export enum EmployeeSubRole {
  SALON_OWNER = "salon_owner",
  MANAGER = "manager",
  STAFF = "staff",
  RECEPTIONIST = "receptionist",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
  PENDING_VERIFICATION = "pending_verification",
  VERIFIED = "verified",
  BLOCKED = "blocked",
  DELETED = "deleted",
  ONBOARDING = "onboarding",
  PROFILE_SETUP = "profile_setup",
  PAYMENT_PENDING = "payment_pending",
  TRIAL = "trial",
  EXPIRED = "expired",
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  language: string;
  timezone: string;
}

// 🎯 INTERFACE BASE COMPLETA
export interface UserBase extends Document {
  _id: string;
  email: string;
  password: string;

  // Dados pessoais
  fullName: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  phoneNumber: string;
  birthDate?: Date;
  gender?: "male" | "female" | "other";
  profileImage?: string;

  // Endereço
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // Autenticação & Status
  role: UserMainRole;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  emailVerifiedAt?: Date;

  // Preferências
  preferences: UserPreferences;

  // Atividade
  lastLogin?: Date;
  lastActivity?: Date;
  loginCount: number;
  failedLoginAttempts: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// 🎯 MÉTODOS
export interface UserBaseMethods {
  softDelete(deletedBy?: string): Promise<this>;
  restore(): Promise<this>;
  verifyEmail(): Promise<this>;
  activateAccount(): Promise<this>;
}

export interface UserBaseModelStatic extends Model<UserBase> {
  includeDeleted(): Query<any, UserBase>;
  findByIdIncludeDeleted(id: string): Query<any, UserBase>;
}

export type UserBaseDocument = UserBase & UserBaseMethods;

// =============================================
// 🆕 INTERFACES PARA DISCRIMINATORS
// =============================================

// 🎯 CLIENT USER (APENAS CAMPOS ESPECÍFICOS)
export interface ClientUser extends UserBase {
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
}

// 🎯 EMPLOYEE USER (APENAS CAMPOS ESPECÍFICOS)
export interface EmployeeUser extends UserBase {
  employeeData: {
    subRole: EmployeeSubRole;
    professionalTitle: string;
    specialization?: string[];
    bio?: string;
    experienceYears: number;
    hireDate: Date;
    salary?: number;
    workSchedule: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    services: string[];
    rating: {
      average: number;
      totalReviews: number;
    };
    isAvailable: boolean;
  };
}

// 🎯 ADMIN USER (APENAS CAMPOS ESPECÍFICOS)
export interface AdminUser extends UserBase {
  adminData: {
    permissions: string[];
    accessLevel: "full" | "limited" | "readonly";
    lastSystemAccess?: Date;
    managedUsers: number;
    systemNotifications: boolean;
  };
}

// =============================================
// 🎯 TIPOS PARA REGISTRO
// =============================================

export interface BaseRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  acceptTerms: boolean;
  role: UserMainRole;
}

export interface ClientRegistrationData extends BaseRegistrationData {
  role: UserMainRole.CLIENT;
  preferences?: Partial<UserPreferences>;
}

export interface EmployeeRegistrationData extends BaseRegistrationData {
  role: UserMainRole.EMPLOYEE;
  subRole: EmployeeSubRole;
  employeeData?: {
    professionalTitle?: string;
    specialization?: string;
    bio?: string;
    experienceYears?: number;
    services?: string[];
  };
}

export interface AdminRegistrationData extends BaseRegistrationData {
  role: UserMainRole.ADMINSYSTEM;
  adminData?: {
    permissions?: string[];
    accessLevel?: "full" | "limited" | "readonly";
    managedUsers?: number;
    systemNotifications?: boolean;
  };
}

export type RegistrationData =
  | ClientRegistrationData
  | EmployeeRegistrationData
  | AdminRegistrationData;

// 🎯 RESPOSTAS DE REGISTRO
export interface StartRegistrationSuccessResponse {
  success: true;
  data: {
    email: string;
    available: boolean;
    otpSent: boolean;
    userStatus: "NEW_USER" | "INACTIVE_USER" | "ACTIVE_USER";
    requiresOtp: boolean;
    message: string;
    flowType:
      | "client_registration"
      | "employee_registration"
      | "admin_registration"
      | "client_direct_registration"
      | "employee_direct_registration";
    subRole?: EmployeeSubRole;
    timestamp: string;
  };
}

export interface FinalRegistrationSuccessResponse {
  success: true;
  message: string;
  data: {
    user: any;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}
