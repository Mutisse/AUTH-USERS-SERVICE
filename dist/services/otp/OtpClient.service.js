"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpClientService = void 0;
const axios_1 = __importDefault(require("axios"));
class OtpClientService {
    constructor() {
        this.notificationServiceUrl =
            process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3006";
    }
    async callOTPService(endpoint, data) {
        console.log(`📞 [OTP CALL] ${endpoint} para: ${data.email}`);
        try {
            let url;
            let method;
            if (endpoint === "status") {
                url = `${this.notificationServiceUrl}/otp/status/${data.email}`;
                method = "GET";
            }
            else {
                url = `${this.notificationServiceUrl}/otp/${endpoint}`;
                method = "POST";
            }
            const response = await (0, axios_1.default)({
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
        }
        catch (error) {
            console.error(`❌ [OTP CALL] Erro em ${endpoint}:`, error.response?.data || error.message);
            const otpMessage = error.response?.data?.error || error.response?.data?.message;
            return {
                success: false,
                message: otpMessage || "Serviço de OTP indisponível",
                data: error.response?.data || {},
            };
        }
    }
    async sendRegistrationOTP(email, name) {
        return this.callOTPService("send", {
            email,
            purpose: "registration",
            name,
        });
    }
    async sendPasswordRecoveryOTP(email, name) {
        return this.callOTPService("send", {
            email,
            purpose: "password-recovery",
            name: name || "Usuário",
        });
    }
    async verifyRegistrationOTP(email, code) {
        return this.callOTPService("verify", {
            email,
            code,
            purpose: "registration",
        });
    }
    async verifyPasswordRecoveryOTP(email, code) {
        return this.callOTPService("verify", {
            email,
            code,
            purpose: "password-recovery",
        });
    }
    async invalidateOTP(email, purpose = "password-recovery") {
        return this.callOTPService("invalidate", {
            email,
            purpose,
        });
    }
    async checkOTPVerificationStatus(email, purpose) {
        return this.callOTPService("check-verification", {
            email,
            purpose,
        });
    }
    async resendOTP(email, name) {
        return this.callOTPService("resend", {
            email,
            name: name || "Usuário",
        });
    }
    async getOTPStatus(email) {
        return this.callOTPService("status", { email });
    }
    async checkActiveOTP(email, purpose) {
        const queryParams = purpose ? `?purpose=${purpose}` : '';
        return this.callOTPService(`check-active/${email}${queryParams}`, { email });
    }
}
exports.OtpClientService = OtpClientService;
