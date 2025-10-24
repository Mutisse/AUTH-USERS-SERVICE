// AUTH-USERS-SERVICE/src/controllers/verificy/cleanup/RegistrationCleanup.controller.ts
import { Request, Response, NextFunction } from "express";
import { RegistrationCleanupService } from "../../../services/verificy/cleanup/RegistrationCleanup.service";
import { AppError } from "../../../utils/AppError";

export class RegistrationCleanupController {
  private cleanupService: RegistrationCleanupService;

  constructor() {
    this.cleanupService = new RegistrationCleanupService();
  }

  /**
   * ✅ LIMPAR REGISTRO FALHADO
   */
  public cleanupFailedRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, role, reason, step, data } = req.body;

      // ✅ VALIDAÇÕES
      if (!email || !role || !reason || !step) {
        throw new AppError(
          "Email, role, reason e step são obrigatórios",
          400,
          "MISSING_REQUIRED_FIELDS"
        );
      }

      const validSteps = [
        "start_registration",
        "otp_verification",
        "final_registration",
      ];
      if (!validSteps.includes(step)) {
        throw new AppError(
          `Step inválido. Deve ser um dos: ${validSteps.join(", ")}`,
          400,
          "INVALID_STEP"
        );
      }

      const result = await this.cleanupService.cleanupFailedRegistration(
        email,
        role,
        reason,
        step,
        data
      );

      return res.status(200).json({
        success: result.success,
        data: {
          email,
          role,
          cleaned: result.cleaned,
          message: result.message,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          processedAt: new Date().toISOString(),
          step,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * ✅ LIMPEZA EM MASSA (APENAS ADMIN)
   */
  public bulkCleanup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { hours = 24 } = req.body;
      const hoursNumber = parseInt(hours);

      if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 720) {
        throw new AppError(
          "Hours deve ser um número entre 1 e 720 (1 hora a 30 dias)",
          400,
          "INVALID_HOURS"
        );
      }

      const result = await this.cleanupService.bulkCleanupStaleRegistrations(
        hoursNumber
      );

      return res.status(200).json({
        success: result.success,
        data: {
          hours: hoursNumber,
          cleaned: result.cleaned,
          message: result.message,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          processedAt: new Date().toISOString(),
          totalCleaned:
            result.cleaned.clients +
            result.cleaned.employees +
            result.cleaned.admins,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * ✅ VERIFICAR STATUS DE REGISTRO
   */
  public getRegistrationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const status = await this.cleanupService.getRegistrationStatus(email);

      return res.status(200).json({
        success: true,
        data: {
          email,
          ...status,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          processedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * ✅ HEALTH CHECK DO CLEANUP SERVICE
   */
  public healthCheck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // ✅ TESTAR CONEXÃO COM BANCO FAZENDO UMA CONSULTA SIMPLES
      const testEmail = "test@cleanup.com";
      const status = await this.cleanupService.getRegistrationStatus(testEmail);

      return res.status(200).json({
        success: true,
        data: {
          service: "registration-cleanup",
          status: "healthy",
          timestamp: new Date().toISOString(),
          database: "connected",
          features: [
            "failed_registration_cleanup",
            "bulk_cleanup",
            "registration_status_check",
          ],
        },
      });
    } catch (error) {
      console.error("[CLEANUP_HEALTH] Erro no health check:", error);

      return res.status(503).json({
        success: false,
        error: "Cleanup service unhealthy",
        timestamp: new Date().toISOString(),
      });
    }
  };
  // AUTH-USERS-SERVICE/src/controllers/verificy/cleanup/RegistrationCleanup.controller.ts

  // AUTH-USERS-SERVICE/src/services/verificy/cleanup/RegistrationCleanup.service.ts

  public async getCleanupStats() {
    try {
      // 🚧 IMPLEMENTAR LÓGICA DE ESTATÍSTICAS REAIS
      return {
        totalCleanups: 0,
        failedRegistrations: 0,
        successfulCleanups: 0,
        pendingCleanups: 0,
        byUserType: {
          client: 0,
          employee: 0,
          admin: 0,
        },
        lastCleanup: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[CleanupService] Erro ao obter estatísticas:", error);
      throw error;
    }
  }
}
