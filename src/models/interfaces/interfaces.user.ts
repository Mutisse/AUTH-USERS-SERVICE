/**
 * Tipos e interfaces completos para gestão de usuários
 */
export enum UserMainRole {
  CLIENT = "client",
  EMPLOYEE = "employee",
  ADMINSYSTEM = "admin_system",
}

export enum EmployeeSubRole {
  SALON_OWNER = "salon_owner",
  MANAGER = "salon_manager",
  STAFF = "salon_staff",
}

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
  PENDING_VERIFICATION = "pending_verification",
}

export enum DocumentType {
  BI = "BI",
  PASSPORT = "passport",
  DIRE = "DIRE",
  DRIVERS_LICENSE = "drivers_license",
  OTHER = "other",
}

export type Role =
  | UserMainRole.CLIENT
  | UserMainRole.ADMINSYSTEM
  | `${UserMainRole.EMPLOYEE}_${EmployeeSubRole}`;

export interface Name {
  firstName: string;
  lastName: string;
  display?: string;
}

export interface Identification {
  documentType?: DocumentType;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  issuingAuthority?: string;
  documentPhoto?: string;
  isExpired?: boolean;
}

export interface Address {
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  houseNumber?: string;
  complement?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface UserPreferences {
  theme?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  language?: string;
  timezone?: string;
  accessibility?: {
    highContrast: boolean;
    fontSize: number;
    screenReader: boolean;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  subRole?: EmployeeSubRole;
  isVerified: boolean;
  isActive: boolean;
  status: UserStatus;
  fullName: Name;
  profileImage?: string;
  lastLogin?: Date;
  requiresPasswordChange: boolean;
  password?: string; // Adicionado para validação
}

export interface CompleteUser extends SessionUser {
  preferences: UserPreferences;
  phoneNumber?: string;
  birthDate?: Date;
  gender?: Gender;
  address?: Address;
  verification: {
    email: boolean;
    phone: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  isOnline?: boolean;
}

export interface VerificationResponse {
  verified: boolean;
  method: "email" | "phone" | "identity";
  verifiedAt: Date;
  nextVerificationStep?: "phone" | "identity";
}

export interface UserWithRelations extends CompleteUser {
  ownedSalons?: string[];
  managedSalons?: string[];
  favoriteSalons?: string[];
}

// interfaces.user.ts - Atualize a interface
export interface CreateUserDto {
  fullName: Name;
  email: string;
  password: string;
  role: Role;
  subRole?: EmployeeSubRole;
  gender?: Gender;
  birthDate?: Date;
  phoneNumber?: string; // ✅ ADICIONE ESTE CAMPO
  address?: Omit<Address, "coordinates">;
  identification?: Omit<Identification, "isExpired">;
  sendWelcomeEmail?: boolean;
  isActive?: boolean;
  status?: UserStatus;
  preferences?: UserPreferences;
  captchaToken?: string;
  acceptTerms?: boolean; // ✅ ADICIONE SE NECESSÁRIO
}

export interface UpdateUserDto {
  fullName?: Partial<Name>;
  email?: string;
  role?: Role;
  subRole?: EmployeeSubRole | null;
  gender?: Gender;
  birthDate?: Date | null;
  phoneNumber?: string | null;
  profileImage?: string | null;
  address?: Address | null;
  identification?: Partial<Identification>;
  preferences?: UserPreferences;
  timezone?: string;
  locale?: string;
  isActive?: boolean;
  isVerified?: boolean;
  status?: UserStatus;
  metadata?: Record<string, any>;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface PasswordResetDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerificationDto {
  token: string;
  email: string;
}

export interface UserResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode?: number;
  details?: any;
  message?: string;
}

export interface UserDocument extends Omit<CompleteUser, "id"> {
  _id: string;
  password: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  verificationToken?: string;
  verificationExpires?: Date;
  twoFactorSecret?: string;
  failedLoginAttempts?: number;
  lastLoginAttempt?: Date;
  lastActivity?: Date;
  loginCount?: number;
  requiresPasswordChange?: boolean;
  passwordHistory?: {
    password: string;
    changedAt: Date;
  }[];
  activityLog?: Array<{
    action: string;
    timestamp: Date;
    ipAddress: string;
    device: string;
    location?: {
      city?: string;
      country?: string;
    };
  }>;
  deleted?: boolean;
  deletedAt?: Date | null;
  __v?: number;
}
