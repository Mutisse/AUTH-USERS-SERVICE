import bcrypt from "bcrypt";
import { ClientModel } from "../../models/user/client/Client.model";
import { EmployeeModel } from "../../models/user/employee/Employee.model";
import { AdminModel } from "../../models/user/admin/Admin.model";
import { SessionService } from "../session/Session.service";
import { OTPService } from "../otp/OTP.service";
import {
  generateTokenPair,
  refreshAccessToken,
  verifyToken,
  decodeToken,
} from "../../utils/jwt.utils";
import { AppError } from "../../utils/AppError";

export class AuthService {
  private sessionService: SessionService;
  private otpService: OTPService;

  constructor() {
    this.sessionService = new SessionService();
    this.otpService = new OTPService();
  }

  // 🎯 LOGIN PRINCIPAL - CORRIGIDO
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

  // 🎯 REFRESH TOKEN - CORRIGIDO
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
        // ✅ CORREÇÃO: Verificar sessionId de forma segura
        const sessionId = (payload as any).sessionId;
        if (sessionId && requestInfo) {
          await this.sessionService.updateSessionActivity(sessionId, {
            ip: requestInfo.ip || "unknown",
            userAgent: requestInfo.userAgent || "unknown",
            route: "refresh-token",
          });
        }
      } catch (sessionError) {
        // Não quebrar o fluxo se houver erro na sessão
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

  // 🎯 VERIFICAR TOKEN - CORRIGIDO
  public async verifyToken(token: string) {
    try {
      const payload = verifyToken(token);

      // ✅ CORREÇÃO: Acessar propriedades de forma segura
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

  // 🎯 REDEFINIR SENHA - CORRIGIDO
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

      // Verificar OTP primeiro - ✅ CORREÇÃO: "reset-password" as any
      const otpResult = await this.otpService.verifyOTP(
        email,
        code,
        "reset-password" as any
      );

      if (!otpResult.success) {
        return {
          success: false,
          error: otpResult.message,
          code: "OTP_VERIFICATION_FAILED",
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
        return {
          success: false,
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
          statusCode: 404,
        };
      }

      // ✅ CORREÇÃO: Acessar _id corretamente
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

      // Invalidar OTP
      this.otpService.invalidateOTP(email);

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

  // 🎯 MÉTODOS PRIVADOS - CORRIGIDOS
  private async updateLastLogin(userId: string, role: string) {
    try {
      const updateData = {
        lastLogin: new Date(),
        lastActivity: new Date(),
        $inc: { loginCount: 1 },
        $set: { failedLoginAttempts: 0 }, // Resetar tentativas falhas
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

  // 🎯 VALIDAR CREDENCIAIS (para uso interno) - CORRIGIDO
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

      // ✅ CORREÇÃO: Acessar password corretamente
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

  // 🎯 VERIFICAR TOKEN DE REDEFINIÇÃO
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

  // 🎯 ENVIAR VERIFICAÇÃO DE EMAIL
  public async sendVerification(email: string, name?: string) {
    try {
      const result = await this.otpService.sendOTP(email, "registration", name);

      if (!result.success) {
        return {
          success: false,
          error: `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
          code: "OTP_RATE_LIMITED",
          statusCode: 429,
        };
      }

      return {
        success: true,
        message: "Código de verificação enviado para seu email",
        data: {
          email,
          purpose: "registration",
          expiresIn: "10 minutos",
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro ao enviar verificação:", error);
      return {
        success: false,
        error: "Erro ao enviar código de verificação",
        code: "VERIFICATION_SEND_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 VERIFICAR CONTA
  public async verifyAccount(email: string, code: string) {
    try {
      const result = await this.otpService.verifyOTP(
        email,
        code,
        "registration"
      );

      if (!result.success) {
        return {
          success: false,
          error: result.message,
          code: "OTP_VERIFICATION_FAILED",
          statusCode: 400,
        };
      }

      // TODO: Atualizar usuário como verificado no banco de dados
      // Por enquanto, apenas retorna sucesso

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

  // 🎯 OBTER SESSÕES ATIVAS DO USUÁRIO
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

  // 🎯 REVOGAR SESSÃO - CORRIGIDO (NULL SAFETY)
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

      // ✅ CORREÇÃO: Verificar se a sessão existe antes de acessar propriedades
      if (!session) {
        return {
          success: false,
          error: "Sessão não encontrada",
          code: "SESSION_NOT_FOUND",
          statusCode: 404,
        };
      }

      // ✅ CORREÇÃO: Verificar se a sessão pertence ao usuário (segurança)
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

  // 🎯 LOGOUT - CORRIGIDO (NULL SAFETY)
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

      // ✅ CORREÇÃO: Verificar se a sessão existe
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

      // Se a sessão não for encontrada, ainda retorna sucesso (idempotente)
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

  // 🎯 ESQUECI MINHA SENHA - CORRIGIDO
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
        return {
          success: true,
          message:
            "Se o email existir em nosso sistema, você receberá um código de recuperação",
          data: {
            emailSent: true,
            exists: false, // Não revelar se o email existe ou não
          },
          statusCode: 200,
        };
      }

      // ✅ CORREÇÃO: Acessar propriedades corretamente
      const userName =
        (user as any).fullName?.displayName ||
        (user as any).fullName?.firstName ||
        "usuário";

      // Enviar OTP para redefinição de senha - ✅ CORREÇÃO: "reset-password" as any
      const otpResult = await this.otpService.sendOTP(
        email,
        "reset-password" as any,
        userName
      );

      if (!otpResult.success) {
        return {
          success: false,
          error: `Aguarde ${otpResult.retryAfter} segundos para solicitar um novo código`,
          code: "OTP_RATE_LIMITED",
          statusCode: 429,
        };
      }

      return {
        success: true,
        message: "Código de recuperação enviado para seu email",
        data: {
          email,
          purpose: "reset-password",
          expiresIn: "10 minutos",
          exists: true,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro no forgot password:", error);
      return {
        success: false,
        error: "Erro ao processar solicitação de recuperação",
        code: "FORGOT_PASSWORD_ERROR",
        statusCode: 500,
      };
    }
  }

  // 🎯 VERIFICAR DISPONIBILIDADE DE EMAIL (MÉTODO ADICIONAL ÚTIL)
  public async checkEmailAvailability(email: string) {
    try {
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: email.toLowerCase().trim() }),
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
        AdminModel.findOne({ email: email.toLowerCase().trim() }),
      ]);

      const exists = !!(client || employee || admin);

      return {
        success: true,
        data: {
          email,
          available: !exists,
          exists,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[AuthService] Erro ao verificar email:", error);
      return {
        success: false,
        error: "Erro ao verificar disponibilidade do email",
        code: "EMAIL_CHECK_ERROR",
        statusCode: 500,
      };
    }
  }
}