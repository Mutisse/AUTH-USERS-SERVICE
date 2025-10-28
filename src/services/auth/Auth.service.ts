import bcrypt from "bcrypt";
import { ClientModel } from "../../models/user/client/Client.model";
import { EmployeeModel } from "../../models/user/employee/Employee.model";
import { AdminModel } from "../../models/user/admin/Admin.model";
import { SessionService } from "../session/Session.service";
import { RegistrationCleanupUtil } from "../../utils/RegistrationCleanupUtil";
import { OtpClientService } from "../otp/OtpClient.service"; // ✅ NOVO IMPORT

import {
  generateTokenPair,
  refreshAccessToken,
  verifyToken,
  decodeToken,
} from "../../utils/jwt.utils";

export class AuthService {
  private sessionService: SessionService;
  private cleanupUtil: RegistrationCleanupUtil;
  private otpClient: OtpClientService; // ✅ NOVA PROPRIEDADE

  constructor() {
    this.sessionService = new SessionService();
    this.cleanupUtil = new RegistrationCleanupUtil(ClientModel);
    this.cleanupUtil.startScheduledCleanup();
    this.otpClient = new OtpClientService(); // ✅ INICIALIZAR OTP CLIENT
  }

  // ✅ MÉTODO ADICIONADO: ENVIAR VERIFICAÇÃO (SEM OTP - APENAS VERIFICA EMAIL)
  public async sendVerification(email: string) {
    try {
      // Verificar se email já existe
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: email.toLowerCase().trim() }),
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
        AdminModel.findOne({ email: email.toLowerCase().trim() }),
      ]);

      const exists = !!(client || employee || admin);

      if (exists) {
        return {
          success: false,
          error: "Email já cadastrado",
          code: "EMAIL_ALREADY_EXISTS",
          statusCode: 409,
        };
      }

      // ✅ APENAS VERIFICA DISPONIBILIDADE - OTP SERÁ ENVIADO PELO GATEWAY/NOTIFICATIONS
      console.log(
        `📧 [AuthService] Email disponível: ${email} - OTP será enviado pelo Gateway`
      );

      return {
        success: true,
        message: "Email disponível para cadastro",
        data: {
          email,
          available: true,
          requiresOtp: true, // ✅ INDICA QUE O GATEWAY DEVE ENVIAR OTP
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro no sendVerification:", error);
      return {
        success: false,
        error: "Erro ao verificar email",
        code: "VERIFICATION_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 LOGIN PRINCIPAL - CORRIGIDO (MANTIDO IGUAL)
  public async login(
    email: string,
    password: string,
    requestInfo: {
      ip: string;
      userAgent: string;
      isSecure: boolean;
    }
  ) {
    try {
      // Buscar usuário em todos os modelos
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: email.toLowerCase().trim() }).select(
          "+password"
        ),
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }).select(
          "+password"
        ),
        AdminModel.findOne({ email: email.toLowerCase().trim() }).select(
          "+password"
        ),
      ]);

      const user = client || employee || admin;

      if (!user) {
        return {
          success: false,
          error: "Credenciais inválidas",
          code: "INVALID_CREDENTIALS",
          statusCode: 401,
        };
      }

      // ✅ CORREÇÃO: Acessar propriedade role corretamente
      const userRole = (user as any).role;
      const userId = (user as any)._id.toString();
      const userEmail = (user as any).email;
      const userIsVerified = (user as any).isVerified;
      const userIsActive = (user as any).isActive;

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(
        password,
        (user as any).password
      );
      if (!isPasswordValid) {
        return {
          success: false,
          error: "Credenciais inválidas",
          code: "INVALID_CREDENTIALS",
          statusCode: 401,
        };
      }

      // Verificar se a conta está ativa
      if (!userIsActive) {
        return {
          success: false,
          error: "Conta desativada",
          code: "ACCOUNT_DISABLED",
          statusCode: 423,
        };
      }

      // Verificar se o email está verificado (para clientes)
      if (userRole === "client" && !userIsVerified) {
        return {
          success: false,
          error: "Email não verificado",
          code: "EMAIL_NOT_VERIFIED",
          statusCode: 403,
        };
      }

      // Atualizar último login
      await this.updateLastLogin(userId, userRole);

      // ✅ CORREÇÃO: Obter subRole corretamente
      let subRole: string | undefined;
      if (userRole === "employee") {
        subRole = (user as any).employeeData?.subRole;
      } else if (userRole === "admin_system") {
        subRole = (user as any).adminData?.accessLevel;
      }

      // Gerar tokens
      const tokenPair = generateTokenPair({
        id: userId,
        email: userEmail,
        role: userRole,
        subRole: subRole,
        isVerified: userIsVerified,
      });

      // 🎯 CRIAR SESSÃO
      const session = await this.sessionService.createSession(
        {
          userId: userId,
          userRole: userRole,
          userEmail: userEmail,
          userName: (user as any).fullName?.displayName || userEmail,
        },
        {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
        },
        {
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          isSecure: requestInfo.isSecure,
        }
      );

      // Remover senha da resposta
      const userWithoutPassword = { ...(user as any).toObject() };
      delete userWithoutPassword.password;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          sessionId: session._id,
        },
        statusCode: 200,
        message: "Login realizado com sucesso",
      };
    } catch (error) {
      console.error("[AuthService] Erro no login:", error);
      return {
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 REFRESH TOKEN - CORRIGIDO (MANTIDO IGUAL)
  public async refreshToken(
    refreshToken: string,
    requestInfo?: {
      ip?: string;
      userAgent?: string;
    }
  ) {
    try {
      const result = refreshAccessToken(refreshToken);

      // 🎯 ATUALIZAR ATIVIDADE DA SESSÃO SE POSSÍVEL
      try {
        const payload = decodeToken(refreshToken);
        const sessionId = (payload as any).sessionId;
        if (sessionId && requestInfo) {
          await this.sessionService.updateSessionActivity(sessionId, {
            ip: requestInfo.ip || "unknown",
            userAgent: requestInfo.userAgent || "unknown",
            route: "refresh-token",
          });
        }
      } catch (sessionError) {
        console.error(
          "[AuthService] Erro ao atualizar sessão no refresh:",
          sessionError
        );
      }

      return {
        success: true,
        data: result,
        statusCode: 200,
        message: "Token atualizado com sucesso",
      };
    } catch (error) {
      return {
        success: false,
        error: "Refresh token inválido ou expirado",
        code: "INVALID_REFRESH_TOKEN",
        statusCode: 401,
      };
    }
  }

  // 🎯 VERIFICAR TOKEN - CORRIGIDO (MANTIDO IGUAL)
  public async verifyToken(token: string) {
    try {
      const payload = verifyToken(token);
      const payloadAny = payload as any;

      return {
        success: true,
        data: {
          valid: true,
          user: {
            id: payloadAny.id,
            email: payloadAny.email,
            role: payloadAny.role,
            subRole: payloadAny.subRole,
            isVerified: payloadAny.isVerified,
          },
          expiresIn: payloadAny.exp ? new Date(payloadAny.exp * 1000) : null,
        },
        statusCode: 200,
        message: "Token válido",
      };
    } catch (error) {
      return {
        success: false,
        error: "Token inválido ou expirado",
        code: "INVALID_TOKEN",
        statusCode: 401,
      };
    }
  }

  // 🎯 REDEFINIR SENHA - AGORA COM VERIFICAÇÃO DE OTP
  public async resetPassword(email: string, code: string, newPassword: string) {
    try {
      if (newPassword.length < 6) {
        return {
          success: false,
          error: "A senha deve ter pelo menos 6 caracteres",
          code: "WEAK_PASSWORD",
          statusCode: 400,
        };
      }

      // ✅ AGORA VERIFICAMOS O OTP ANTES DE REDEFINIR
      console.log(
        `[AuthService] Verificando OTP para: ${email}, código: ${code}`
      );

      const otpResult = await this.otpClient.verifyPasswordRecoveryOTP(
        email,
        code
      );

      if (!otpResult.success) {
        return {
          success: false,
          error:
            otpResult.message || "Código de verificação inválido ou expirado",
          code: "INVALID_OTP",
          statusCode: 400,
        };
      }

      console.log(
        `✅ [AuthService] OTP verificado - Redefinindo senha para: ${email}`
      );

      // Buscar usuário em todos os modelos
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: email.toLowerCase().trim() }),
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
        AdminModel.findOne({ email: email.toLowerCase().trim() }),
      ]);

      const user = client || employee || admin;

      if (!user) {
        return {
          success: false,
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
          statusCode: 404,
        };
      }

      const userId = (user as any)._id;

      // Atualizar senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      if (client) {
        await ClientModel.findByIdAndUpdate(userId, {
          password: hashedPassword,
        });
      } else if (employee) {
        await EmployeeModel.findByIdAndUpdate(userId, {
          password: hashedPassword,
        });
      } else if (admin) {
        await AdminModel.findByIdAndUpdate(userId, {
          password: hashedPassword,
        });
      }

      // 🎯 TERMINAR TODAS AS SESSÕES DO USUÁRIO (segurança)
      await this.sessionService.terminateAllUserSessions(
        userId.toString(),
        "password_reset"
      );

      return {
        success: true,
        message: "Senha redefinida com sucesso",
        data: {
          email,
          passwordUpdated: true,
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro no reset password:", error);
      return {
        success: false,
        error: "Erro ao redefinir senha",
        code: "RESET_PASSWORD_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 VERIFICAR CONTA - CORRIGIDO (SEM OTP - APENAS MARCA COMO VERIFICADO)
  public async verifyAccount(email: string, code: string) {
    try {
      // ✅ CORREÇÃO: OTP SERÁ VERIFICADO PELO GATEWAY/NOTIFICATIONS SERVICE
      console.log(`[AuthService] Verificando conta: ${email}, código: ${code}`);
      // O gateway já deve ter verificado o OTP antes de chamar este método

      // Buscar usuário (cliente) para marcar como verificado
      const client = await ClientModel.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!client) {
        return {
          success: false,
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
          statusCode: 404,
        };
      }

      // Marcar como verificado
      await ClientModel.findByIdAndUpdate(client._id, {
        isVerified: true,
        verifiedAt: new Date(),
      });

      return {
        success: true,
        message: "Conta verificada com sucesso",
        data: {
          email,
          verified: true,
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro ao verificar conta:", error);
      return {
        success: false,
        error: "Erro ao verificar conta",
        code: "VERIFICATION_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 ESQUECI MINHA SENHA - AGORA COM ENVIO DE OTP
  public async forgotPassword(email: string) {
    try {
      if (!email) {
        return {
          success: false,
          error: "Email é obrigatório",
          code: "MISSING_EMAIL",
          statusCode: 400,
        };
      }

      // Buscar usuário em todos os modelos
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: email.toLowerCase().trim() }),
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
        AdminModel.findOne({ email: email.toLowerCase().trim() }),
      ]);

      const user = client || employee || admin;

      if (!user) {
        // Por segurança, retornar sucesso mesmo se o email não existir
        console.log(
          `📧 [AuthService] Email não encontrado: ${email} - Retornando resposta segura`
        );
        return {
          success: true,
          message:
            "Se o email existir em nosso sistema, você receberá um código de recuperação",
          data: {
            emailExists: false,
            requiresOtp: true,
          },
          statusCode: 200,
        };
      }

      // ✅ AGORA ENVIAMOS O OTP PARA RECUPERAÇÃO DE SENHA
      const userId = (user as any)._id.toString();
      const userName =
        (user as any).fullName?.displayName || (user as any).name || email;

      console.log(
        `📧 [AuthService] Usuário encontrado: ${email} - Enviando OTP de recuperação...`
      );

      const otpResult = await this.otpClient.sendPasswordRecoveryOTP(
        email,
        userName
      );

      if (!otpResult.success) {
        console.warn(
          `⚠️ [AuthService] OTP não enviado para ${email}: ${otpResult.message}`
        );

        // Mesmo se OTP falhar, retornamos sucesso por segurança
        return {
          success: true,
          message:
            "Solicitação processada. Verifique seu email para o código de recuperação",
          data: {
            email,
            emailExists: true,
            requiresOtp: true,
            purpose: "reset-password",
            otpSent: false,
            fallback: true,
          },
          statusCode: 200,
        };
      }

      console.log(`✅ [AuthService] OTP enviado com sucesso para: ${email}`);

      return {
        success: true,
        message: "Código de recuperação enviado para seu email",
        data: {
          email,
          emailExists: true,
          requiresOtp: true,
          purpose: "reset-password",
          otpSent: true,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro no forgot password:", error);

      // Fallback em caso de erro
      return {
        success: true,
        message:
          "Solicitação processada. Verifique seu email para o código de recuperação",
        data: {
          email,
          emailExists: true,
          requiresOtp: true,
          purpose: "reset-password",
          otpSent: false,
          fallback: true,
        },
        statusCode: 200,
      };
    }
  }

  // 🎯 MÉTODOS PRIVADOS - CORRIGIDOS (MANTIDOS IGUAIS)
  private async updateLastLogin(userId: string, role: string) {
    try {
      const updateData = {
        lastLogin: new Date(),
        lastActivity: new Date(),
        $inc: { loginCount: 1 },
        $set: { failedLoginAttempts: 0 },
      };

      switch (role) {
        case "client":
          await ClientModel.findByIdAndUpdate(userId, updateData);
          break;
        case "employee":
          await EmployeeModel.findByIdAndUpdate(userId, updateData);
          break;
        case "admin_system":
          await AdminModel.findByIdAndUpdate(userId, updateData);
          break;
      }
    } catch (error) {
      console.error("[AuthService] Erro ao atualizar último login:", error);
    }
  }

  // 🎯 VALIDAR CREDENCIAIS (para uso interno) - CORRIGIDO (MANTIDO IGUAL)
  public async validateCredentials(email: string, password: string) {
    try {
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: email.toLowerCase().trim() }).select(
          "+password"
        ),
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }).select(
          "+password"
        ),
        AdminModel.findOne({ email: email.toLowerCase().trim() }).select(
          "+password"
        ),
      ]);

      const user = client || employee || admin;

      if (!user) {
        return { isValid: false, user: null };
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        (user as any).password
      );
      return { isValid: isPasswordValid, user };
    } catch (error) {
      console.error("[AuthService] Erro ao validar credenciais:", error);
      return { isValid: false, user: null };
    }
  }

  // 🎯 VERIFICAR TOKEN DE REDEFINIÇÃO (MANTIDO IGUAL)
  public async verifyResetToken(token: string) {
    try {
      const payload = verifyToken(token);

      return {
        success: true,
        data: {
          valid: true,
          email: payload.email,
          canReset: true,
        },
        statusCode: 200,
        message: "Token de redefinição válido",
      };
    } catch (error) {
      return {
        success: false,
        error: "Token de redefinição inválido ou expirado",
        code: "INVALID_RESET_TOKEN",
        statusCode: 401,
      };
    }
  }

  // 🎯 OBTER SESSÕES ATIVAS DO USUÁRIO (MANTIDO IGUAL)
  public async getActiveSessions(userId: string) {
    try {
      const sessions = await this.sessionService.getUserActiveSessions(userId);

      return {
        success: true,
        data: {
          sessions,
          total: sessions.length,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro ao buscar sessões ativas:", error);
      return {
        success: false,
        error: "Erro ao buscar sessões ativas",
        code: "GET_SESSIONS_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 REVOGAR SESSÃO - CORRIGIDO (NULL SAFETY) (MANTIDO IGUAL)
  public async revokeSession(
    sessionId: string,
    userId: string,
    revokeData?: {
      ip?: string;
      userAgent?: string;
    }
  ) {
    try {
      const session = await this.sessionService.logoutSession(sessionId, {
        ...revokeData,
        reason: "revoked_by_user",
      });

      if (!session) {
        return {
          success: false,
          error: "Sessão não encontrada",
          code: "SESSION_NOT_FOUND",
          statusCode: 404,
        };
      }

      if (session.userId !== userId) {
        return {
          success: false,
          error: "Não autorizado",
          code: "UNAUTHORIZED",
          statusCode: 403,
        };
      }

      return {
        success: true,
        data: {
          sessionId,
          revoked: true,
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
        message: "Sessão revogada com sucesso",
      };
    } catch (error) {
      console.error("[AuthService] Erro ao revogar sessão:", error);
      return {
        success: false,
        error: "Erro ao revogar sessão",
        code: "REVOKE_SESSION_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 LOGOUT - CORRIGIDO (NULL SAFETY) (MANTIDO IGUAL)
  public async logout(
    sessionId: string,
    logoutData?: {
      ip?: string;
      userAgent?: string;
      reason?: string;
    }
  ) {
    try {
      if (!sessionId) {
        return {
          success: false,
          error: "ID da sessão é obrigatório",
          code: "MISSING_SESSION_ID",
          statusCode: 400,
        };
      }

      const session = await this.sessionService.logoutSession(
        sessionId,
        logoutData
      );

      if (!session) {
        return {
          success: true,
          data: {
            sessionId,
            loggedOut: true,
            timestamp: new Date().toISOString(),
          },
          statusCode: 200,
          message: "Sessão já finalizada",
        };
      }

      return {
        success: true,
        data: {
          sessionId: session._id,
          loggedOut: true,
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
        message: "Logout realizado com sucesso",
      };
    } catch (error) {
      console.error("[AuthService] Erro no logout:", error);

      if ((error as any).message?.includes("não encontrada")) {
        return {
          success: true,
          data: {
            sessionId,
            loggedOut: true,
            timestamp: new Date().toISOString(),
          },
          statusCode: 200,
          message: "Sessão já finalizada",
        };
      }

      return {
        success: false,
        error: "Erro ao realizar logout",
        code: "LOGOUT_ERROR",
        statusCode: 500,
      };
    }
  }

  // ✅ MÉTODO ADICIONAL: LIMPEZA MANUAL (OPCIONAL)
  public async triggerCleanup(): Promise<{
    success: boolean;
    deletedCount?: number;
    message: string;
  }> {
    try {
      const result = await this.cleanupUtil.manualCleanup();

      if (result.success) {
        return {
          success: true,
          deletedCount: result.deletedCount,
          message: `Limpeza manual concluída: ${result.deletedCount} registros removidos`,
        };
      } else {
        return {
          success: false,
          message: "Erro na limpeza manual",
        };
      }
    } catch (error) {
      console.error("[AuthService] Erro na limpeza manual:", error);
      return {
        success: false,
        message: "Erro ao executar limpeza manual",
      };
    }
  }
}
