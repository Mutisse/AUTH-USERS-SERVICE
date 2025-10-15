import { OTPModel, IOTP } from "../../models/OTP.model";
import { VerifiedEmailModel } from "../../models/VerifiedEmail.model";
import { EmailService } from "../email/Email.service";
import { AppError } from "../../utils/AppError";

export class OTPService {
  private emailService: EmailService;
  private readonly OTP_CONFIG = {
    LENGTH: 6,
    EXPIRES_IN: 30,
    MAX_ATTEMPTS: 5,
    RESEND_DELAY: 60,
  };

  constructor() {
    this.emailService = new EmailService();
  }

  private generateOTP(): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < this.OTP_CONFIG.LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  async sendOTP(
    email: string,
    purpose: IOTP["purpose"] = "registration",
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      const recentOTP = await OTPModel.findOne({
        email,
        purpose,
        createdAt: {
          $gte: new Date(Date.now() - this.OTP_CONFIG.RESEND_DELAY * 1000),
        },
      });

      if (recentOTP) {
        const timeElapsed = Date.now() - recentOTP.createdAt.getTime();
        const retryAfter = this.OTP_CONFIG.RESEND_DELAY * 1000 - timeElapsed;
        if (retryAfter > 0) {
          return {
            success: false,
            retryAfter: Math.ceil(retryAfter / 1000),
          };
        }
      }

      await OTPModel.updateMany(
        { email, purpose, verified: false },
        { verified: true }
      );

      const otpCode = this.generateOTP();
      const expiresAt = new Date(
        Date.now() + this.OTP_CONFIG.EXPIRES_IN * 60 * 1000
      );

      const otpData = new OTPModel({
        email,
        code: otpCode,
        purpose,
        attempts: 0,
        verified: false,
        expiresAt,
      });

      await otpData.save();

      const emailSent = await this.emailService.sendOTP(email, otpCode, name);

      if (!emailSent) {
        await OTPModel.findByIdAndDelete(otpData._id);
        throw new AppError(
          "Erro ao enviar email de verificação",
          500,
          "EMAIL_SEND_ERROR"
        );
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async verifyOTP(
    email: string,
    code: string,
    purpose?: IOTP["purpose"]
  ): Promise<{ success: boolean; message: string }> {
    try {
      const otpData = await OTPModel.findOne({
        email,
        purpose: purpose || "registration",
        expiresAt: { $gt: new Date() },
      });

      if (!otpData) {
        return {
          success: false,
          message: "Código OTP não encontrado ou expirado",
        };
      }

      if (otpData.verified) {
        return {
          success: false,
          message: "Código OTP já foi utilizado. Solicite um novo código.",
        };
      }

      if (otpData.attempts >= this.OTP_CONFIG.MAX_ATTEMPTS) {
        await OTPModel.findByIdAndUpdate(otpData._id, { verified: true });
        return {
          success: false,
          message:
            "Número máximo de tentativas excedido. Solicite um novo código.",
        };
      }

      if (otpData.code !== code) {
        otpData.attempts += 1;
        await otpData.save();

        const remainingAttempts =
          this.OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          message: `Código OTP inválido. ${remainingAttempts} tentativa(s) restante(s).`,
        };
      }

      // ✅ ATUALIZAÇÃO: Marcar OTP como verificado
      otpData.verified = true;
      otpData.usedAt = new Date();
      await otpData.save();

      // ✅ NOVO: Marcar email como verificado no sistema
      await this.markEmailAsVerified(email, 'registration');

      return {
        success: true,
        message: "Email verificado com sucesso",
      };
    } catch (error) {
      throw error;
    }
  }

  async resendOTP(
    email: string,
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      const existingOTP = await OTPModel.findOne({
        email,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      const purpose = existingOTP?.purpose || "registration";

      if (existingOTP) {
        await OTPModel.findByIdAndUpdate(existingOTP._id, { verified: true });
      }

      return await this.sendOTP(email, purpose, name);
    } catch (error) {
      throw error;
    }
  }

  // ✅ NOVO MÉTODO: Marcar email como verificado
  async markEmailAsVerified(email: string, purpose: string = 'registration'): Promise<void> {
    try {
      await VerifiedEmailModel.findOneAndUpdate(
        { email: email.toLowerCase().trim(), purpose },
        {
          isVerified: true,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      throw new AppError('Erro ao marcar email como verificado', 500, 'EMAIL_VERIFICATION_ERROR');
    }
  }

  // ✅ NOVO MÉTODO: Verificar se email foi verificado
  async isEmailVerified(email: string, purpose: string = 'registration'): Promise<boolean> {
    try {
      const verification = await VerifiedEmailModel.findOne({
        email: email.toLowerCase().trim(),
        purpose,
        isVerified: true,
        expiresAt: { $gt: new Date() },
      });
      
      return !!verification;
    } catch (error) {
      return false;
    }
  }

  // ✅ NOVO MÉTODO: Invalidar verificação de email
  async invalidateEmailVerification(email: string, purpose: string = 'registration'): Promise<void> {
    try {
      await VerifiedEmailModel.findOneAndUpdate(
        { email: email.toLowerCase().trim(), purpose },
        { isVerified: false, verifiedAt: null }
      );
    } catch (error) {
      throw new AppError('Erro ao invalidar verificação de email', 500, 'INVALIDATE_VERIFICATION_ERROR');
    }
  }

  async getOTPStatus(email: string): Promise<{
    exists: boolean;
    verified: boolean;
    attempts: number;
    expiresAt: Date | null;
  }> {
    const otpData = await OTPModel.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpData) {
      return { exists: false, verified: false, attempts: 0, expiresAt: null };
    }

    return {
      exists: true,
      verified: otpData.verified,
      attempts: otpData.attempts,
      expiresAt: otpData.expiresAt,
    };
  }

  async invalidateOTP(email: string): Promise<void> {
    await OTPModel.updateMany({ email, verified: false }, { verified: true });
  }

  async cleanupExpiredOTPs(): Promise<{ deleted: number }> {
    const result = await OTPModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return { deleted: result.deletedCount || 0 };
  }

  async getOTPStatistics(email: string): Promise<{
    totalSent: number;
    totalVerified: number;
    lastSent: Date | null;
  }> {
    const totalSent = await OTPModel.countDocuments({ email });
    const totalVerified = await OTPModel.countDocuments({
      email,
      verified: true,
    });
    const lastOTP = await OTPModel.findOne({ email })
      .sort({ createdAt: -1 })
      .select("createdAt");

    return {
      totalSent,
      totalVerified,
      lastSent: lastOTP?.createdAt || null,
    };
  }

  async getOTPByEmail(email: string): Promise<IOTP | null> {
    return await OTPModel.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async incrementAttempts(email: string): Promise<void> {
    const otpData = await OTPModel.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (otpData) {
      otpData.attempts += 1;
      await otpData.save();
    }
  }
}