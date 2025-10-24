import { Request, Response } from "express";
import { EmailVerificationService } from "../../../services/verificy/email/EmailVerification.service";
import { UserStatus } from "../../../models/interfaces/user.roles";

export class EmailVerificationController {
  private emailService: EmailVerificationService;

  constructor() {
    this.emailService = new EmailVerificationService();
  }

  // ✅ VERIFICAÇÃO SIMPLES DE EMAIL (COMPATIBILIDADE)
  public checkEmailAvailability = async (req: Request, res: Response) => {
    await this.handleEmailVerification(req, res, { useCache: false });
  };

  // ✅ VERIFICAÇÃO COM CACHE (COMPATIBILIDADE)
  public checkEmailAvailabilityCached = async (req: Request, res: Response) => {
    await this.handleEmailVerification(req, res, { useCache: true });
  };

  // ✅ VERIFICAÇÃO AVANÇADA FLEXÍVEL
  public checkEmailAvailabilityAdvanced = async (req: Request, res: Response) => {
    try {
      const { email, options } = req.body;

      if (!email) {
        return this.sendErrorResponse(res, 400, "Email é obrigatório", "MISSING_EMAIL");
      }

      console.log(`🎯 [EMAIL-CONTROLLER] Verificação avançada para: ${email}`, options);

      const result = await this.emailService.checkEmailAvailabilityAdvanced(email, options);

      return res.status(result.statusCode).json(result);

    } catch (error) {
      console.error("[EmailController] Erro na verificação avançada:", error);
      return this.sendErrorResponse(res, 500, "Erro interno no servidor", "INTERNAL_ERROR");
    }
  };

  // ✅ HANDLER PRINCIPAL FLEXÍVEL
  private async handleEmailVerification(req: Request, res: Response, defaultOptions: any = {}) {
    const startTime = Date.now();
    
    try {
      const { email, options } = req.body;

      if (!email) {
        return this.sendErrorResponse(res, 400, "Email é obrigatório", "MISSING_EMAIL", startTime);
      }

      const processingOptions = { ...defaultOptions, ...options };
      const result = await this.emailService.checkEmailAvailabilityAdvanced(email, processingOptions);

      return res.status(result.statusCode).json(result);

    } catch (error) {
      console.error("[EmailController] Erro ao verificar email:", error);
      return this.sendErrorResponse(res, 500, "Erro interno no servidor", "INTERNAL_ERROR", startTime);
    }
  }

  // ✅ ROTA PARA VERIFICAR STATUS ESPECÍFICO
  public checkStatusInfo = async (req: Request, res: Response) => {
    try {
      const { status } = req.params;

      if (!status || !Object.values(UserStatus).includes(status as UserStatus)) {
        return res.status(400).json({
          success: false,
          error: "Status inválido",
          validStatuses: Object.values(UserStatus),
          timestamp: new Date().toISOString(),
        });
      }

      const statusInfo = this.emailService.getStatusInfo(status as UserStatus);

      return res.status(200).json({
        success: true,
        data: {
          status,
          ...statusInfo,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[EmailController] Erro ao verificar status:", error);
      return this.sendErrorResponse(res, 500, "Erro interno no servidor", "INTERNAL_ERROR");
    }
  };

  // ✅ ROTA PARA LIMPAR CACHE
  public clearEmailCache = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      this.emailService.clearCache(email);

      console.log(`🗑️ [EMAIL-CONTROLLER] Cache ${email ? `para ${email}` : 'completo'} limpo`);

      return res.status(200).json({
        success: true,
        message: email ? `Cache para ${email} limpo` : "Cache de emails limpo com sucesso",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[EmailController] Erro ao limpar cache:", error);
      return this.sendErrorResponse(res, 500, "Erro ao limpar cache", "CACHE_CLEAR_ERROR");
    }
  };

  // ✅ ROTA PARA ESTATÍSTICAS DO CACHE
  public getCacheStats = async (req: Request, res: Response) => {
    try {
      const stats = this.emailService.getCacheStats();

      return res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[EmailController] Erro ao obter estatísticas:", error);
      return this.sendErrorResponse(res, 500, "Erro ao obter estatísticas do cache", "STATS_ERROR");
    }
  };

  // ✅ HEALTH CHECK ATUALIZADO
  public healthCheck = async (req: Request, res: Response) => {
    const cacheStats = this.emailService.getCacheStats();
    
    res.json({
      service: "Email Verification Controller",
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "4.0.0",
      features: [
        "email_availability_check",
        "advanced_caching_system", 
        "flexible_options",
        "user_type_detection",
        "status_management",
        "performance_monitoring"
      ],
      cache: cacheStats,
      supportedStatuses: Object.values(UserStatus),
    });
  };

  // ✅ MÉTODO AUXILIAR PARA RESPOSTAS DE ERRO
  private sendErrorResponse(
    res: Response, 
    statusCode: number, 
    error: string, 
    code: string,
    startTime?: number
  ) {
    const responseTime = startTime ? Date.now() - startTime : 0;
    
    return res.status(statusCode).json({
      success: false,
      error,
      code,
      timestamp: new Date().toISOString(),
      ...(responseTime > 0 && { responseTime: `${responseTime}ms` })
    });
  }
}