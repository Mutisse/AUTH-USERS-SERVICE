// src/middleware/rate-limiting.middleware.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// =============================================
// 🛡️ CONFIGURAÇÕES GERAIS DE RATE LIMITING
// =============================================

// ✅ RATE LIMIT PARA AUTENTICAÇÃO
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo de 10 tentativas por IP por janela
  message: {
    success: false,
    error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ RATE LIMIT PARA OTP
export const otpRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // Máximo de 5 OTPs por IP por janela
  message: {
    success: false,
    error: 'Muitas solicitações de OTP. Tente novamente em 5 minutos.',
    code: 'OTP_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ RATE LIMIT PARA VERIFICAÇÃO DE EMAIL
export const emailVerificationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // Máximo de 20 verificações por IP por janela
  message: {
    success: false,
    error: 'Muitas verificações de email. Tente novamente em 10 minutos.',
    code: 'EMAIL_VERIFICATION_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ RATE LIMIT PARA REGISTRO DE USUÁRIOS
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Máximo de 5 registros por IP por hora
  message: {
    success: false,
    error: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
    code: 'REGISTRATION_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ RATE LIMIT PARA API EM GERAL
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo de 100 requisições por IP por janela
  message: {
    success: false,
    error: 'Muitas requisições para a API. Tente novamente em 15 minutos.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ RATE LIMIT PARA ADMIN
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // Limite mais alto para admin
  message: {
    success: false,
    error: 'Limite de requisições administrativas excedido.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================
// 🛠️ MIDDLEWARE PERSONALIZADO
// =============================================

// ✅ MIDDLEWARE PARA SKIP DE RATE LIMIT EM DESENVOLVIMENTO
export const developmentSkipLimit = (req: Request, res: Response, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  return apiRateLimit(req, res, next);
};

// ✅ HELPER PARA VERIFICAR LIMITES
export const checkRateLimit = (req: Request): boolean => {
  // Implementação para verificar limites customizados
  return true;
};

// ✅ MIDDLEWARE DE LOG PARA RATE LIMITING
export const rateLimitLogger = (req: Request, res: Response, next: any) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  console.log(`📊 Rate Limit Check - IP: ${clientIP}, Path: ${req.path}`);
  next();
};

export default {
  authRateLimit,
  otpRateLimit,
  emailVerificationRateLimit,
  registrationRateLimit,
  apiRateLimit,
  adminRateLimit,
  developmentSkipLimit
};