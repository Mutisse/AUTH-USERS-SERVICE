import NodeCache from "node-cache";
import { EmailService } from "../email/Email.service";
import { AppError } from "../../utils/AppError";

export interface OTPData {
  code: string;
  email: string;
  attempts: number;
  createdAt: Date;
  verified: boolean;
  purpose: "registration" | "reset-password" | "login";
}

export class OTPService {
  private cache: NodeCache;
  private emailService: EmailService;

  // 🎯 CONFIGURAÇÕES OTP
  private readonly OTP_CONFIG = {
    LENGTH: 6,
    EXPIRES_IN: 10 * 60, // 10 minutos em segundos
    MAX_ATTEMPTS: 3,
    RESEND_DELAY: 60, // 1 minuto entre reenvios
  };

  constructor() {
    this.cache = new NodeCache({
      stdTTL: this.OTP_CONFIG.EXPIRES_IN,
      checkperiod: 60,
    });
    this.emailService = new EmailService();
  }

  // 🎯 GERAR CÓDIGO OTP
  private generateOTP(): string {
    const digits = "0123456789";
    let otp = "";

    for (let i = 0; i < this.OTP_CONFIG.LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }

    return otp;
  }

  // 🎯 ENVIAR OTP
  async sendOTP(
    email: string,
    purpose: OTPData["purpose"] = "registration",
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      // 🎯 VERIFICAR RATE LIMITING
      const existingOTP = this.cache.get<OTPData>(email);
      if (existingOTP) {
        const timeElapsed = Date.now() - existingOTP.createdAt.getTime();
        const retryAfter = this.OTP_CONFIG.RESEND_DELAY * 1000 - timeElapsed;

        if (retryAfter > 0) {
          return {
            success: false,
            retryAfter: Math.ceil(retryAfter / 1000),
          };
        }
      }

      // 🎯 GERAR NOVO OTP
      const otpCode = this.generateOTP();
      const otpData: OTPData = {
        code: otpCode,
        email,
        attempts: 0,
        createdAt: new Date(),
        verified: false,
        purpose,
      };

      // 🎯 SALVAR NO CACHE
      this.cache.set(email, otpData);

      // 🎯 ENVIAR EMAIL
      const emailSent = await this.emailService.sendOTP(email, otpCode, name);

      if (!emailSent) {
        this.cache.del(email);
        throw new AppError(
          "Erro ao enviar email de verificação",
          500,
          "EMAIL_SEND_ERROR"
        );
      }

      console.log(`✅ OTP gerado para ${email}: ${otpCode} (${purpose})`);
      return { success: true };
    } catch (error) {
      console.error("❌ Erro no serviço OTP:", error);
      throw error;
    }
  }

  // 🎯 VERIFICAR OTP
  async verifyOTP(
    email: string,
    code: string,
    purpose?: OTPData["purpose"]
  ): Promise<{ success: boolean; message: string }> {
    try {
      const otpData = this.cache.get<OTPData>(email);

      // 🎯 VERIFICAÇÕES
      if (!otpData) {
        return {
          success: false,
          message: "Código OTP não encontrado ou expirado",
        };
      }

      if (otpData.verified) {
        return {
          success: false,
          message: "Código OTP já foi utilizado",
        };
      }

      if (otpData.attempts >= this.OTP_CONFIG.MAX_ATTEMPTS) {
        this.cache.del(email);
        return {
          success: false,
          message:
            "Número máximo de tentativas excedido. Solicite um novo código.",
        };
      }

      if (purpose && otpData.purpose !== purpose) {
        return {
          success: false,
          message: "Código OTP inválido para esta operação",
        };
      }

      // 🎯 VERIFICAR CÓDIGO
      if (otpData.code !== code) {
        otpData.attempts++;
        this.cache.set(email, otpData);

        const remainingAttempts =
          this.OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;

        return {
          success: false,
          message: `Código OTP inválido. ${remainingAttempts} tentativa(s) restante(s).`,
        };
      }

      // 🎯 OTP VÁLIDO - MARCA COMO VERIFICADO
      otpData.verified = true;
      this.cache.set(email, otpData);

      console.log(`✅ OTP verificado com sucesso para: ${email}`);
      return {
        success: true,
        message: "Email verificado com sucesso",
      };
    } catch (error) {
      console.error("❌ Erro ao verificar OTP:", error);
      throw error;
    }
  }

  // 🎯 REENVIAR OTP
  async resendOTP(
    email: string,
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      const existingOTP = this.cache.get<OTPData>(email);
      const purpose = existingOTP?.purpose || "registration";

      // 🎯 LIMPAR OTP ANTIGO
      this.cache.del(email);

      // 🎯 ENVIAR NOVO OTP
      return await this.sendOTP(email, purpose, name);
    } catch (error) {
      console.error("❌ Erro ao reenviar OTP:", error);
      throw error;
    }
  }

  // 🎯 VERIFICAR STATUS DO OTP
  getOTPStatus(email: string): {
    exists: boolean;
    verified: boolean;
    attempts: number;
    expiresAt: Date | null;
  } {
    const otpData = this.cache.get<OTPData>(email);

    if (!otpData) {
      return { exists: false, verified: false, attempts: 0, expiresAt: null };
    }

    const expiresAt = new Date(
      otpData.createdAt.getTime() + this.OTP_CONFIG.EXPIRES_IN * 1000
    );

    return {
      exists: true,
      verified: otpData.verified,
      attempts: otpData.attempts,
      expiresAt,
    };
  }

  // 🎯 INVALIDAR OTP
  invalidateOTP(email: string): void {
    this.cache.del(email);
    console.log(`✅ OTP invalidado para: ${email}`);
  }

  // 🎯 LIMPAR CACHE EXPIRADO (para manutenção)
  cleanupExpiredOTPs(): void {
    this.cache.keys().forEach((key) => {
      const otpData = this.cache.get<OTPData>(key);
      if (
        otpData &&
        otpData.createdAt.getTime() + this.OTP_CONFIG.EXPIRES_IN * 1000 <
          Date.now()
      ) {
        this.cache.del(key);
      }
    });
  }
}
