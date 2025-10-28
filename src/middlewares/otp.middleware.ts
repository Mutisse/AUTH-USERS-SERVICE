import { OtpClientService } from "../services/otp/OtpClient.service";

export interface OTPStatus {
  exists: boolean;
  verified: boolean;
  expiresAt?: Date;
  purpose?: string;
}

export class OTPService {
  private otpClient: OtpClientService;

  constructor() {
    this.otpClient = new OtpClientService();
  }

  /**
   * Verificar status do OTP para um email
   */
  async getOTPStatus(email: string): Promise<OTPStatus> {
    try {
      const response = await this.otpClient.getOTPStatus(email);
      
      if (!response.success) {
        return {
          exists: false,
          verified: false
        };
      }

      // Adapte conforme a estrutura real da resposta do seu serviço
      const otpData = response.data;
      
      return {
        exists: otpData?.exists || otpData?.active || false,
        verified: otpData?.verified || otpData?.isVerified || false,
        expiresAt: otpData?.expiresAt ? new Date(otpData.expiresAt) : undefined,
        purpose: otpData?.purpose
      };
    } catch (error) {
      console.error(`❌ [OTP Service] Erro ao buscar status para ${email}:`, error);
      return {
        exists: false,
        verified: false
      };
    }
  }

  /**
   * Verificar se email está verificado para um propósito específico
   */
  async isEmailVerified(email: string, purpose: string = "registration"): Promise<boolean> {
    try {
      const response = await this.otpClient.checkOTPVerificationStatus(email, purpose);
      
      return response.success && response.data?.verified === true;
    } catch (error) {
      console.error(`❌ [OTP Service] Erro ao verificar email ${email}:`, error);
      return false;
    }
  }

  /**
   * Enviar OTP para registro
   */
  async sendRegistrationOTP(email: string, name: string): Promise<boolean> {
    const response = await this.otpClient.sendRegistrationOTP(email, name);
    return response.success;
  }

  /**
   * Verificar OTP para registro
   */
  async verifyRegistrationOTP(email: string, code: string): Promise<boolean> {
    const response = await this.otpClient.verifyRegistrationOTP(email, code);
    return response.success;
  }

  /**
   * Invalidar OTP após uso
   */
  async invalidateOTP(email: string, purpose: string = "registration"): Promise<boolean> {
    const response = await this.otpClient.invalidateOTP(email, purpose);
    return response.success;
  }
}