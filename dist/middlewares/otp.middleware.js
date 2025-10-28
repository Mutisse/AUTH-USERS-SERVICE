"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const OtpClient_service_1 = require("../services/otp/OtpClient.service");
class OTPService {
    constructor() {
        this.otpClient = new OtpClient_service_1.OtpClientService();
    }
    async getOTPStatus(email) {
        try {
            const response = await this.otpClient.getOTPStatus(email);
            if (!response.success) {
                return {
                    exists: false,
                    verified: false
                };
            }
            const otpData = response.data;
            return {
                exists: otpData?.exists || otpData?.active || false,
                verified: otpData?.verified || otpData?.isVerified || false,
                expiresAt: otpData?.expiresAt ? new Date(otpData.expiresAt) : undefined,
                purpose: otpData?.purpose
            };
        }
        catch (error) {
            console.error(`❌ [OTP Service] Erro ao buscar status para ${email}:`, error);
            return {
                exists: false,
                verified: false
            };
        }
    }
    async isEmailVerified(email, purpose = "registration") {
        try {
            const response = await this.otpClient.checkOTPVerificationStatus(email, purpose);
            return response.success && response.data?.verified === true;
        }
        catch (error) {
            console.error(`❌ [OTP Service] Erro ao verificar email ${email}:`, error);
            return false;
        }
    }
    async sendRegistrationOTP(email, name) {
        const response = await this.otpClient.sendRegistrationOTP(email, name);
        return response.success;
    }
    async verifyRegistrationOTP(email, code) {
        const response = await this.otpClient.verifyRegistrationOTP(email, code);
        return response.success;
    }
    async invalidateOTP(email, purpose = "registration") {
        const response = await this.otpClient.invalidateOTP(email, purpose);
        return response.success;
    }
}
exports.OTPService = OTPService;
