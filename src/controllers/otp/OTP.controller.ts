import { Request, Response, NextFunction } from "express";
import { OTPService } from "../../services/otp/OTP.service";
import { AppError } from "../../utils/AppError";

export class OTPController {
  private otpService: OTPService;

  constructor() {
    this.otpService = new OTPService();
  }

  public sendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, purpose = "registration", name } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      const result = await this.otpService.sendOTP(email, purpose, name);

      if (!result.success) {
        throw new AppError(
          `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
          429,
          "OTP_RATE_LIMITED"
        );
      }

      res.status(200).json({
        success: true,
        message: "Código de verificação enviado para seu email",
        data: {
          email,
          purpose,
          expiresIn: "10 minutos",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, otpCode, purpose } = req.body;

      if (!email || !otpCode) {
        throw new AppError(
          "Email e código são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const result = await this.otpService.verifyOTP(email, otpCode, purpose);

      if (!result.success) {
        throw new AppError(result.message, 400, "OTP_VERIFICATION_FAILED");
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email,
          verified: true,
          purpose,
          verifiedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public resendOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const result = await this.otpService.resendOTP(email, name);

      if (!result.success) {
        throw new AppError(
          `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
          429,
          "OTP_RATE_LIMITED"
        );
      }

      res.status(200).json({
        success: true,
        message: "Novo código de verificação enviado para seu email",
        data: {
          email,
          expiresIn: "10 minutos",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const status = await this.otpService.getOTPStatus(email);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };
}