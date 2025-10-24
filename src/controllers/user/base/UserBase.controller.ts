// AUTH-USERS-SERVICE/src/controllers/user/base/UserBase.controller.ts
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { EmailVerificationService } from "../../../services/verificy/email/EmailVerification.service";
import { RegistrationCleanupService } from "../../../services/verificy/cleanup/RegistrationCleanup.service";
import { AppError } from "../../../utils/AppError";
import { UserStatus } from "../../../models/interfaces/user.roles";
import {
  EmailCheckResponse,
  OTPResponse,
  ApiResponse,
} from "../../../models/interfaces/email.interface";

export abstract class UserBaseController {
  protected abstract userService: any;
  protected abstract userType: string;
  protected abstract flowType: string;
  protected cleanupService: RegistrationCleanupService;
  protected emailService: EmailVerificationService;

  constructor() {
    this.cleanupService = new RegistrationCleanupService();
    this.emailService = new EmailVerificationService();
  }

  // ✅ MÉTODO ÚNICO para transformar dados
  private transformUserData(data: any): any {
    const transformed = { ...data };

    if (data.firstName && !data.fullName) {
      transformed.fullName = {
        firstName: data.firstName,
        lastName: data.lastName || "",
      };
      delete transformed.firstName;
      delete transformed.lastName;
    }

    if (data.phone && !data.phoneNumber) {
      transformed.phoneNumber = data.phone;
      delete transformed.phone;
    }

    return transformed;
  }

  // ✅ MÉTODO CORRIGIDO - USAR INTERFACE OTPResponse
  private async callOTPService(
    endpoint: string,
    data: any
  ): Promise<OTPResponse> {
    const notificationServiceUrl =
      process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3006";

    console.log(`📞 [OTP CALL] ${endpoint} para: ${data.email}`);

    try {
      const response = await axios({
        method: endpoint === "status" ? "GET" : "POST",
        url:
          endpoint === "status"
            ? `${notificationServiceUrl}/otp/status/${data.email}`
            : `${notificationServiceUrl}/otp/${endpoint}`,
        data: endpoint !== "status" ? data : undefined,
        timeout: 8000,
        headers: { "Content-Type": "application/json" },
      });

      return {
        success: Boolean(response.data?.success),
        message: response.data?.message || "",
        data: response.data?.data || {},
        retryAfter: response.data?.retryAfter,
      };
    } catch (error) {
      console.error(`❌ [OTP CALL] Erro em ${endpoint}:`, error);

      return {
        success: false,
        message: "Serviço de OTP indisponível",
        data: {},
      };
    }
  }

  // ✅ MÉTODO ÚNICO para respostas - USAR INTERFACE ApiResponse
  private apiResponse(
    success: boolean,
    message: string,
    data: any = {},
    code?: string,
    statusCode: number = 200
  ): ApiResponse {
    return {
      success,
      message,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      code,
      statusCode,
    };
  }

  // ✅ MÉTODO ÚNICO para autorização
  protected isAuthorized(currentUser: any, targetUserId?: string): boolean {
    return Boolean(
      currentUser?.role === "admin_system" ||
        (targetUserId && currentUser?.id === targetUserId)
    );
  }

  // ✅ MÉTODO PARA VERIFICAR EMAIL DE FORMA SEGURA - CORREÇÃO DA TIPAGEM
  private async checkEmailAvailability(
    email: string
  ): Promise<EmailCheckResponse> {
    try {
      const emailCheck = await this.emailService.checkEmailAvailabilityAdvanced(
        email
      );
      return emailCheck as EmailCheckResponse;
    } catch (error) {
      console.error("❌ Erro ao verificar email:", error);

      const errorResponse = {
        success: false as const,
        error: "Erro interno ao verificar email",
        code: "EMAIL_CHECK_ERROR",
        statusCode: 500,
        timestamp: new Date().toISOString(),
        responseTime: "0ms",
        metadata: {
          email: email,
          processedAt: new Date().toISOString(),
          responseTime: 0,
        },
      } as EmailCheckResponse;

      return errorResponse;
    }
  }

  // 1. ✅ REGISTRO E OTP
  public startRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, firstName, lastName, password, acceptTerms } = req.body;

      console.log(`🎯 [${this.userType}] Iniciando registro para: ${email}`);

      if (!email || !password) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Email e senha são obrigatórios",
              {},
              "MISSING_CREDENTIALS",
              400
            )
          );
      }

      if (!firstName) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Nome é obrigatório",
              {},
              "MISSING_NAME",
              400
            )
          );
      }

      if (!acceptTerms) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Termos devem ser aceitos",
              {},
              "TERMS_NOT_ACCEPTED",
              400
            )
          );
      }

      const specificValidation = await this.validateSpecificData(req.body);
      if (specificValidation) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              specificValidation.error,
              {},
              specificValidation.code,
              400
            )
          );
      }

      const emailCheck = await this.checkEmailAvailability(email);

      if (!emailCheck.success) {
        return res.status(emailCheck.statusCode || 500).json(emailCheck);
      }

      const emailData = emailCheck.data;

      if (!emailData) {
        return res
          .status(500)
          .json(
            this.apiResponse(
              false,
              "Dados de verificação não disponíveis",
              {},
              "EMAIL_CHECK_FAILED",
              500
            )
          );
      }

      const emailExists = Boolean(emailData.exists);
      const isActive = Boolean(emailData.isActive);

      if (emailExists && isActive) {
        return res
          .status(409)
          .json(
            this.apiResponse(
              false,
              "Email já registrado e ativo",
              {},
              "EMAIL_ALREADY_EXISTS",
              409
            )
          );
      }

      const otpResult = await this.callOTPService("send", {
        email,
        purpose: "registration",
        name: `${firstName} ${lastName}`.trim(),
      });

      const otpSuccess = Boolean(otpResult.success);

      if (!otpSuccess) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              otpResult.message || "Erro ao enviar OTP",
              {},
              "OTP_SEND_FAILED",
              400
            )
          );
      }

      return res.json(
        this.apiResponse(true, "Código de verificação enviado", {
          email,
          available: true,
          otpSent: true,
          userStatus: emailExists ? "INACTIVE_USER" : "NEW_USER",
          requiresOtp: true,
          flowType: this.flowType,
          ...this.getAdditionalRegistrationData(req.body),
        })
      );
    } catch (error: any) {
      console.error(`❌ [${this.userType}] Erro no registro:`, error);

      return res.json(
        this.apiResponse(
          true,
          "Email disponível. Serviço de verificação temporariamente indisponível",
          {
            email: req.body.email,
            available: true,
            otpSent: false,
            userStatus: "NEW_USER",
            requiresOtp: false,
            flowType: `${this.userType}_direct`,
            ...this.getAdditionalRegistrationData(req.body),
          }
        )
      );
    }
  };

  // 2. ✅ VERIFICAR OTP
  public verifyOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, code, purpose = "registration" } = req.body;

      if (!email || !code) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Email e código são obrigatórios",
              {},
              "MISSING_OTP_DATA",
              400
            )
          );
      }

      const result = await this.callOTPService("verify", {
        email,
        code,
        purpose,
      });

      const verificationSuccess = Boolean(result.success);

      if (!verificationSuccess) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              result.message || "Código inválido",
              {},
              "INVALID_OTP",
              400
            )
          );
      }

      return res.json(
        this.apiResponse(true, "Código verificado com sucesso!", {
          email,
          verified: true,
          purpose,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  // 3. ✅ REENVIAR OTP
  public resendOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Email é obrigatório",
              {},
              "MISSING_EMAIL",
              400
            )
          );
      }

      const result = await this.callOTPService("resend", { email, name });

      const resendSuccess = Boolean(result.success);

      if (!resendSuccess) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              result.message || "Erro ao reenviar OTP",
              {},
              "OTP_RESEND_FAILED",
              400
            )
          );
      }

      return res.json(
        this.apiResponse(true, "Novo código enviado para seu email", { email })
      );
    } catch (error) {
      return next(error);
    }
  };

  // 4. ✅ STATUS DO OTP
  public getOtpStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Email é obrigatório",
              {},
              "MISSING_EMAIL",
              400
            )
          );
      }

      const result = await this.callOTPService("status", { email });

      return res.json(
        this.apiResponse(true, "Status OTP recuperado", result.data || {})
      );
    } catch (error) {
      return next(error);
    }
  };

  // 5. ✅ STATUS DO REGISTRO
  public getRegistrationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Email é obrigatório",
              {},
              "MISSING_EMAIL",
              400
            )
          );
      }

      const status = await this.cleanupService.getRegistrationStatus(email);

      return res.json(
        this.apiResponse(true, "Status de registro recuperado", {
          email,
          ...status,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  // 6. ✅ LIMPEZA DE REGISTRO
  public cleanupRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, reason } = req.body;

      if (!email || !reason) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Email e motivo são obrigatórios",
              {},
              "MISSING_CLEANUP_DATA",
              400
            )
          );
      }

      const result = await this.cleanupService.cleanupFailedRegistration(
        email,
        this.userType,
        reason,
        "final_registration",
        req.body
      );

      const cleanupSuccess = Boolean(result.success);

      return res.json(
        this.apiResponse(
          cleanupSuccess,
          result.message || "Limpeza concluída",
          {
            email,
            cleaned: result.cleaned,
          }
        )
      );
    } catch (error) {
      return next(error);
    }
  };

  // 7. ✅ CRIAR USUÁRIO
  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userData = this.transformUserData(req.body);

      console.log("🎯 [UserBase] Criando usuário:", {
        email: userData.email,
        hasPassword: !!userData.password,
      });

      if (!userData.email || !userData.password) {
        throw new AppError(
          "Email e senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      if (!userData.fullName?.firstName) {
        throw new AppError("Nome é obrigatório", 400, "MISSING_NAME");
      }

      if (!userData.acceptTerms) {
        throw new AppError(
          "Termos devem ser aceitos",
          400,
          "TERMS_NOT_ACCEPTED"
        );
      }

      const specificValidation = await this.validateSpecificData(userData);
      if (specificValidation) {
        throw new AppError(
          specificValidation.error,
          400,
          specificValidation.code
        );
      }

      const result = await this.userService.createUser({
        ...userData,
        status: this.getDefaultStatus(),
        isActive: true,
        isVerified: true,
      });

      const createSuccess = Boolean(result.success);

      if (!createSuccess) {
        return res.status(result.statusCode || 500).json(result);
      }

      return res
        .status(201)
        .json(
          this.apiResponse(
            true,
            `${this.userType} registrado com sucesso!`,
            result.data
          )
        );
    } catch (error) {
      return next(error);
    }
  };

  // 8. ✅ ATUALIZAR PERFIL
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;
      const updateData = req.body;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      if (!this.isAuthorized((req as any).user, userId)) {
        return res
          .status(403)
          .json(
            this.apiResponse(false, "Não autorizado", {}, "UNAUTHORIZED", 403)
          );
      }

      const result = await this.userService.updateProfile(userId, updateData);

      const updateSuccess = Boolean(result.success);

      if (!updateSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Perfil atualizado com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 9. ✅ OBTER PERFIL
  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.userService.getProfile(userId);

      const getSuccess = Boolean(result.success);

      if (!getSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Perfil recuperado com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 10. ✅ ATIVAR CONTA
  public activateAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;

      const result = await this.userService.activateAccount(userId);

      const activateSuccess = Boolean(result.success);

      if (!activateSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Conta ativada com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 11. ✅ DESATIVAR CONTA
  public deactivateAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;

      if (!currentUser) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      if (!this.isAuthorized(currentUser, userId)) {
        return res
          .status(403)
          .json(
            this.apiResponse(false, "Não autorizado", {}, "UNAUTHORIZED", 403)
          );
      }

      const result = await this.userService.deactivateAccount(userId);

      const deactivateSuccess = Boolean(result.success);

      if (!deactivateSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Conta desativada com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // ✅ MÉTODOS ABSTRATOS
  protected abstract validateSpecificData(
    data: any
  ): Promise<{ error: string; code: string } | null>;
  protected abstract getDefaultStatus(): UserStatus;
  protected abstract getAdditionalRegistrationData(data: any): any;
}
