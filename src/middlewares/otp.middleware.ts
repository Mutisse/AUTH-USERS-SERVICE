import { Request, Response, NextFunction } from "express";
import { OTPService } from "../services/otp/OTP.service";
import { AppError } from "../utils/AppError";

const otpService = new OTPService();

// 🎯 VERIFICAR SE EMAIL ESTÁ VERIFICADO VIA OTP
// src/middlewares/otp.middleware.ts
// CORREÇÃO NO MIDDLEWARE:

export const requireEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
    }

    // ✅ CORREÇÃO: ADICIONAR AWAIT
    const otpStatus = await otpService.getOTPStatus(email);

    if (!otpStatus.exists) {
      throw new AppError(
        "Email não verificado. Solicite um código OTP.",
        403,
        "EMAIL_NOT_VERIFIED"
      );
    }

    if (!otpStatus.verified) {
      throw new AppError(
        "Email não verificado. Complete a verificação com o código OTP.",
        403,
        "EMAIL_NOT_VERIFIED"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// 🎯 RATE LIMITING PARA OTP
export const otpRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const clientIP = req.ip;

    // TODO: Implementar rate limiting por IP e email
    // Por enquanto, apenas prossegue
    next();
  } catch (error) {
    next(error);
  }
};
