// Enums para roles e status
export enum UserMainRole {
  CLIENT = "client",
  EMPLOYEE = "employee", 
  ADMINSYSTEM = "admin_system"
}

export enum EmployeeSubRole {
  SALON_OWNER = "salon_owner",
  MANAGER = "manager",
  STAFF = "staff",
  RECEPTIONIST = "receptionist"
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending"
}

export type Role = UserMainRole | `${UserMainRole.EMPLOYEE}:${EmployeeSubRole}`;

// Interfaces principais
export interface Name {
  firstName: string;
  lastName: string;
  display: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  language: string;
  timezone: string;
  accessibility: {
    highContrast: boolean;
    fontSize: number;
    screenReader: boolean;
  };
}

export interface Verification {
  email: boolean;
  phone: boolean;
  emailToken?: string;
  phoneToken?: string;
  verifiedAt?: Date;
}

export interface PasswordHistory {
  password: string;
  changedAt: Date;
}

// DTOs para criação e atualização
export interface CreateUserDto {
  email: string;
  password: string;
  role: string;
  fullName: Name | string;
  phoneNumber?: string;
  birthDate?: Date;
  gender?: string;
  address?: Address;
  status?: UserStatus;
  isActive?: boolean;
  subRole?: string;
  originalRole?: string;
}

export interface UpdateUserDto {
  email?: string;
  fullName?: Name;
  phoneNumber?: string;
  birthDate?: Date;
  gender?: string;
  address?: Address;
  status?: UserStatus;
  isActive?: boolean;
  role?: string;
  subRole?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface EmailVerificationDto {
  token: string;
  email: string;
}

// Interfaces de resposta
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  subRole?: string | null;
  isVerified: boolean;
  isActive: boolean;
  status: UserStatus;
  fullName: Name;
  profileImage?: string;
  lastLogin?: Date;
  requiresPasswordChange: boolean;
}

export interface CompleteUser extends SessionUser {
  preferences: UserPreferences;
  phoneNumber?: string;
  birthDate?: Date;
  gender?: string;
  address?: Address;
  verification: {
    email: boolean;
    phone: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationResponse {
  verified: boolean;
  method: 'email' | 'phone';
  verifiedAt: Date;
  nextVerificationStep?: 'phone' | 'email';
}

// Interface do documento do MongoDB
export interface UserDocument {
  _id: string;
  email: string;
  password: string;
  role: string;
  subRole?: string | null;
  fullName: Name;
  phoneNumber?: string;
  birthDate?: Date;
  gender?: string;
  address?: Address;
  profileImage?: string;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;
  isOnline?: boolean;
  preferences: UserPreferences;
  verification: Verification;
  lastLogin?: Date;
  lastActivity?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  lastLoginAttempt?: Date;
  requiresPasswordChange: boolean;
  passwordHistory: PasswordHistory[];
  verificationToken?: string;
  verificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface de resposta genérica
export interface UserResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode: number;
  message?: string;
  details?: any;
}