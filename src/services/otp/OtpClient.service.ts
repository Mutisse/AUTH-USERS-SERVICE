// AUTHUSERS-SERVICE/src/services/otp/OtpClient.service.ts
import axios from "axios";

export interface OTPResponse {
  success: boolean;
  message?: string;
  data?: any;
  retryAfter?: number;
}

export class OtpClientService {
  private notificationServiceUrl: string;

  constructor() {
    this.notificationServiceUrl =
      process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3006";
  }

  /**
   * Chamada genérica para o serviço de OTP
   */
  async callOTPService(endpoint: string, data: any): Promise<OTPResponse> {
    console.log(`📞 [OTP CALL] ${endpoint} para: ${data.email}`);

    try {
      let url: string;
      let method: string;

      if (endpoint === "status") {
        url = `${this.notificationServiceUrl}/otp/status/${data.email}`;
        method = "GET";
      } else {
        url = `${this.notificationServiceUrl}/otp/${endpoint}`;
        method = "POST";
      }

      const response = await axios({
        method,
        url,
        data: method === "POST" ? data : undefined,
        timeout: 8000,
        headers: { 
          "Content-Type": "application/json",
          "x-service-source": "auth-service" 
        },
      });

      console.log(`✅ [OTP CALL] ${endpoint} sucesso para: ${data.email}`);

      return {
        success: Boolean(response.data?.success),
        message: response.data?.message || "",
        data: response.data?.data || response.data,
        retryAfter: response.data?.retryAfter,
      };
    } catch (error: any) {
      console.error(`❌ [OTP CALL] Erro em ${endpoint}:`, error.response?.data || error.message);

      // Retornar mensagem mais específica do serviço de OTP se disponível
      const otpMessage = error.response?.data?.error || error.response?.data?.message;
      
      return {
        success: false,
        message: otpMessage || "Serviço de OTP indisponível",
        data: error.response?.data || {},
      };
    }
  }

  /**
   * Enviar OTP para registro
   */
  async sendRegistrationOTP(email: string, name: string): Promise<OTPResponse> {
    return this.callOTPService("send", {
      email,
      purpose: "registration",
      name,
    });
  }

  /**
   * Enviar OTP para recuperação de senha
   */
  async sendPasswordRecoveryOTP(email: string, name?: string): Promise<OTPResponse> {
    return this.callOTPService("send", {
      email,
      purpose: "password-recovery",
      name: name || "Usuário",
    });
  }

  /**
   * Verificar OTP para registro
   */
  async verifyRegistrationOTP(email: string, code: string): Promise<OTPResponse> {
    return this.callOTPService("verify", {
      email,
      code,
      purpose: "registration",
    });
  }

  /**
   * Verificar OTP para recuperação de senha
   */
  async verifyPasswordRecoveryOTP(email: string, code: string): Promise<OTPResponse> {
    return this.callOTPService("verify", {
      email,
      code,
      purpose: "password-recovery",
    });
  }

  /**
   * Invalidar OTP após uso bem-sucedido
   */
  async invalidateOTP(email: string, purpose: string = "password-recovery"): Promise<OTPResponse> {
    return this.callOTPService("invalidate", {
      email,
      purpose,
    });
  }

  /**
   * Verificar se OTP foi previamente verificado
   */
  async checkOTPVerificationStatus(email: string, purpose: string): Promise<OTPResponse> {
    return this.callOTPService("check-verification", {
      email,
      purpose,
    });
  }

  /**
   * Reenviar OTP
   */
  async resendOTP(email: string, name?: string): Promise<OTPResponse> {
    return this.callOTPService("resend", {
      email,
      name: name || "Usuário",
    });
  }

  /**
   * Verificar status do OTP
   */
  async getOTPStatus(email: string): Promise<OTPResponse> {
    return this.callOTPService("status", { email });
  }

  /**
   * Verificar OTP ativo
   */
  async checkActiveOTP(email: string, purpose?: string): Promise<OTPResponse> {
    const queryParams = purpose ? `?purpose=${purpose}` : '';
    return this.callOTPService(`check-active/${email}${queryParams}`, { email });
  }
}