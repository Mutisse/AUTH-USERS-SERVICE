import { Request, Response, NextFunction } from "express";
import { SessionService } from "../../services/session/Session.service";
import { AppError } from "../../utils/AppError";

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  // 🎯 OBTER SESSÕES ATIVAS DO USUÁRIO
  public getActiveSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const sessions = await this.sessionService.getUserActiveSessions(userId);

      return res.status(200).json({
        success: true,
        data: sessions,
        total: sessions.length,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 OBTER HISTÓRICO DE SESSÕES
  public getSessionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;
      const { limit = 10 } = req.query;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const sessions = await this.sessionService.getSessionHistory(
        userId,
        Number(limit)
      );

      return res.status(200).json({
        success: true,
        data: sessions,
        total: sessions.length,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 TERMINAR SESSÃO ESPECÍFICA
  public terminateSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { sessionId } = req.params;
      const currentUserId = (req as any).user?.id;

      const session = await this.sessionService.logoutSession(sessionId, {
        reason: "manual_termination",
        ip: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      // ✅ CORREÇÃO: Verificar se session existe antes de acessar userId
      if (!session || session.userId !== currentUserId) {
        throw new AppError("Não autorizado", 403, "UNAUTHORIZED");
      }

      return res.status(200).json({
        success: true,
        message: "Sessão terminada com sucesso",
        data: session,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 TERMINAR TODAS AS SESSÕES
  public terminateAllSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.sessionService.terminateAllUserSessions(
        userId,
        "user_request"
      );

      return res.status(200).json({
        success: true,
        message: `${result.terminated} sessões terminadas`,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 OBTER ESTATÍSTICAS DE SESSÃO
  public getSessionStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;

      const stats = await this.sessionService.getSessionStats(userId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return next(error);
    }
  };
}
