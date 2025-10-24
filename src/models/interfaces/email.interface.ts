// AUTH-USERS-SERVICE/src/models/interfaces/email.interface.ts
import { UserMainRole, UserStatus } from "./user.roles";

// ✅ Interface para a resposta de sucesso do email service
export interface EmailCheckSuccessResponse {
  success: true;
  data: {
    email: string;
    available: boolean;
    exists: boolean;
    isActive: boolean;
    userType?: UserMainRole;
    status?: UserStatus;
    fromCache: boolean;
    fromFallback: boolean;
    reason: string;
    timestamp: string;
    responseTime: string;
  };
  statusCode: number;
  metadata: {
    processedAt: string;
    responseTime: number;
    email: string;
  };
}

// ✅ Interface para a resposta de erro do email service
export interface EmailCheckErrorResponse {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  timestamp: string;
  responseTime: string;
  metadata: {
    email: string;
    processedAt: string;
    responseTime: number;
  };
}

export type EmailCheckResponse =
  | EmailCheckSuccessResponse
  | EmailCheckErrorResponse;

// ✅ Interface para dados básicos de email
export interface EmailBasicData {
  email: string;
  available: boolean;
  exists: boolean;
  isActive: boolean;
  userType?: UserMainRole;
}

// ✅ Interface para verificação de OTP
export interface OTPVerificationRequest {
  email: string;
  otpCode: string;
  purpose: "registration" | "password_reset" | "email_change";
}

export interface OTPVerificationResponse {
  success: boolean;
  valid: boolean;
  message: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
}

// ✅ Interface para envio de OTP
export interface OTPSendRequest {
  email: string;
  purpose: "registration" | "password_reset" | "email_change";
  name?: string;
}

export interface OTPSendResponse {
  success: boolean;
  message: string;
  otpSent: boolean;
  expiresIn?: number;
  retryAfter?: number;
}

// ✅ Interface para validação de email
export interface EmailValidationResult {
  isValid: boolean;
  suggestions?: string[];
  reason?: string;
  provider?: string;
}

// ✅ Interface para verificação de domínio
export interface DomainCheckResult {
  domain: string;
  valid: boolean;
  disposable: boolean;
  webmail: boolean;
}
// AUTH-USERS-SERVICE/src/models/interfaces/email.interface.ts
// (Adicionar estas interfaces ao arquivo existente)

export interface OTPResponse {
  success: boolean;
  message?: string;
  data?: any;
  retryAfter?: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  code?: string;
  statusCode: number;
}

// Interface existente continua...
