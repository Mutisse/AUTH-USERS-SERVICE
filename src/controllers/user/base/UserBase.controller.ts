// AUTH-USERS-SERVICE/src/controllers/user/base/UserBase.controller.ts
import { Request, Response, NextFunction } from "express";
import { EmailVerificationService } from "../../../services/verificy/email/EmailVerification.service";
import { RegistrationCleanupService } from "../../../services/verificy/cleanup/RegistrationCleanup.service";
import { OtpClientService } from "../../../services/otp/OtpClient.service";
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
  protected otpClient: OtpClientService;

  constructor() {
    this.cleanupService = new RegistrationCleanupService();
    this.emailService = new EmailVerificationService();
    this.otpClient = new OtpClientService();
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

  // ✅ MÉTODO ATUALIZADO - AGORA USA O SERVIÇO UNIFICADO
  private async callOTPService(
    endpoint: string,
    data: any
  ): Promise<OTPResponse> {
    console.log(`📞 [UserBase OTP] ${endpoint} para: ${data.email}`);

    try {
      switch (endpoint) {
        case "send":
          if (data.purpose === "password-recovery") {
            return await this.otpClient.sendPasswordRecoveryOTP(
              data.email,
              data.name
            );
          } else {
            return await this.otpClient.sendRegistrationOTP(
              data.email,
              data.name
            );
          }

        case "verify":
          if (data.purpose === "password-recovery") {
            return await this.otpClient.verifyPasswordRecoveryOTP(
              data.email,
              data.code
            );
          } else {
            return await this.otpClient.verifyRegistrationOTP(
              data.email,
              data.code
            );
          }

        case "resend":
          return await this.otpClient.resendOTP(data.email, data.name);

        case "status":
          return await this.otpClient.getOTPStatus(data.email);

        default:
          return {
            success: false,
            message: "Endpoint OTP não suportado",
            data: {},
          };
      }
    } catch (error) {
      console.error(`❌ [UserBase OTP] Erro em ${endpoint}:`, error);
      return {
        success: false,
        message: "Serviço de OTP indisponível",
        data: {},
      };
    }
  }

  // ✅ MÉTODO ÚNICO para respostas - USAR INTERFACE ApiResponse
  protected apiResponse(
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

  // ✅ MÉTODO PARA DADOS ADICIONAIS DE START REGISTRATION
  protected getAdditionalStartRegistrationData(data: any): any {
    return {};
  }

  // 1. ✅ REGISTRO E OTP - MÉTODO TRADICIONAL (para permitir super)
  public async startRegistration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> {
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

      // ✅ AGORA USA O SERVIÇO UNIFICADO DE OTP
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
          ...this.getAdditionalStartRegistrationData(req.body),
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
            ...this.getAdditionalStartRegistrationData(req.body),
          }
        )
      );
    }
  }

  // 2. ✅ VERIFICAR OTP - AGORA USA SERVIÇO UNIFICADO
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

      // ✅ AGORA USA O SERVIÇO UNIFICADO DE OTP
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

  // 3. ✅ REENVIAR OTP - AGORA USA SERVIÇO UNIFICADO
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

      // ✅ AGORA USA O SERVIÇO UNIFICADO DE OTP
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

  // 4. ✅ STATUS DO OTP - AGORA USA SERVIÇO UNIFICADO
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

      // ✅ AGORA USA O SERVIÇO UNIFICADO DE OTP
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

  // 12. ✅ BUSCAR USUÁRIO POR ID
  public getUserById = async (
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

      const result = await this.userService.getUserById(userId);

      const getSuccess = Boolean(result.success);

      if (!getSuccess) {
        return res.status(result.statusCode || 404).json(result);
      }

      return res.json(
        this.apiResponse(true, "Usuário encontrado com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 13. ✅ LISTAR USUÁRIOS (ADMIN)
  public listUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const currentUser = (req as any).user;

      if (!currentUser) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      if (!this.isAuthorized(currentUser)) {
        return res
          .status(403)
          .json(
            this.apiResponse(false, "Não autorizado", {}, "UNAUTHORIZED", 403)
          );
      }

      const result = await this.userService.listUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
      });

      return res.json(
        this.apiResponse(true, "Usuários listados com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 14. ✅ ATUALIZAR STATUS DO USUÁRIO (ADMIN)
  public updateUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const currentUser = (req as any).user;

      if (!currentUser) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      if (!this.isAuthorized(currentUser)) {
        return res
          .status(403)
          .json(
            this.apiResponse(false, "Não autorizado", {}, "UNAUTHORIZED", 403)
          );
      }

      const result = await this.userService.updateUserStatus(userId, status);

      const updateSuccess = Boolean(result.success);

      if (!updateSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Status atualizado com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 15. ✅ EXCLUIR USUÁRIO (SOFT DELETE)
  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;
      const deletedBy = currentUser?.id;

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

      const result = await this.userService.softDeleteUser(userId, deletedBy);

      const deleteSuccess = Boolean(result.success);

      if (!deleteSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Usuário excluído com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 16. ✅ RESTAURAR USUÁRIO
  public restoreUser = async (
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

      if (!this.isAuthorized(currentUser)) {
        return res
          .status(403)
          .json(
            this.apiResponse(false, "Não autorizado", {}, "UNAUTHORIZED", 403)
          );
      }

      const result = await this.userService.restoreUser(userId);

      const restoreSuccess = Boolean(result.success);

      if (!restoreSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Usuário restaurado com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 17. ✅ EXCLUSÃO PERMANENTE (HARD DELETE)
  public hardDeleteUser = async (
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

      if (!this.isAuthorized(currentUser)) {
        return res
          .status(403)
          .json(
            this.apiResponse(false, "Não autorizado", {}, "UNAUTHORIZED", 403)
          );
      }

      const result = await this.userService.hardDeleteUser(userId);

      const deleteSuccess = Boolean(result.success);

      if (!deleteSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Usuário excluído permanentemente!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 18. ✅ ATUALIZAR SENHA
  public updatePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Senha atual e nova senha são obrigatórias",
              {},
              "MISSING_PASSWORDS",
              400
            )
          );
      }

      const result = await this.userService.updatePassword(
        userId,
        currentPassword,
        newPassword
      );

      const updateSuccess = Boolean(result.success);

      if (!updateSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Senha atualizada com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 19. ✅ RESETAR SENHA (SOLICITAÇÃO)
  public requestPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;

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

      const result = await this.userService.requestPasswordReset(email);

      const requestSuccess = Boolean(result.success);

      if (!requestSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(
          true,
          "Instruções enviadas para seu email",
          result.data
        )
      );
    } catch (error) {
      return next(error);
    }
  };

  // 20. ✅ RESETAR SENHA (CONFIRMAÇÃO)
  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json(
            this.apiResponse(
              false,
              "Token e nova senha são obrigatórios",
              {},
              "MISSING_RESET_DATA",
              400
            )
          );
      }

      const result = await this.userService.resetPassword(token, newPassword);

      const resetSuccess = Boolean(result.success);

      if (!resetSuccess) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.json(
        this.apiResponse(true, "Senha redefinida com sucesso!", result.data)
      );
    } catch (error) {
      return next(error);
    }
  };

  // 21. ✅ VERIFICAR EMAIL
  public verifyEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token } = req.params;

      const result = await this.userService.verifyEmail(token);

      if (!result.success) {
        const errorResult = result as { success: false; error: string };
        throw new AppError(
          errorResult.error || "Token inválido ou expirado",
          400,
          "INVALID_TOKEN"
        );
      }

      res.json({
        success: true,
        message: "Email verificado com sucesso! Sua conta foi ativada.",
        data: (result as any).data,
      });
    } catch (error) {
      next(error);
    }
  };

  // 22. ✅ ATUALIZAR PREFERÊNCIAS
  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;
      const { preferences } = req.body;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHORIZED");
      }

      if (!preferences || typeof preferences !== "object") {
        throw new AppError(
          "Preferências devem ser um objeto válido",
          400,
          "INVALID_PREFERENCES"
        );
      }

      const result = await this.userService.updatePreferences(
        userId,
        preferences
      );

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // ✅ MÉTODOS ABSTRATOS OBRIGATÓRIOS
  protected abstract validateSpecificData(
    data: any
  ): Promise<{ error: string; code: string } | null>;
  protected abstract getDefaultStatus(): UserStatus;
  protected abstract getAdditionalRegistrationData(data: any): any;
}
