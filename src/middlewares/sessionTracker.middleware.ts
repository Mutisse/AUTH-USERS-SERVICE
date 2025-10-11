import { Request, Response, NextFunction } from "express";
import { SessionService } from "../services/session/Session.service";

const sessionService = new SessionService();

export const sessionTracker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Apenas trackear se o usuário estiver autenticado
    if (req.user) {
      const sessionId = req.headers["x-session-id"] as string;

      if (sessionId) {
        await sessionService.updateSessionActivity(sessionId, {
          route: req.route?.path || req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });
      }
    }

    next();
  } catch (error) {
    // Não quebrar o fluxo da aplicação em caso de erro no tracking
    console.error("[SessionTracker] Erro no tracking:", error);
    next();
  }
};

// 🎯 MIDDLEWARE PARA INICIAR SESSÃO (usar após login bem-sucedido)
export const startSessionTracking = (userData: any, tokenData: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await sessionService.createSession(userData, tokenData, {
        ip: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        isSecure: req.secure,
      });

      // Adicionar session ID ao header da resposta
      res.set("X-Session-ID", session._id);

      // Adicionar à resposta se necessário
      if (res.locals.authResponse) {
        res.locals.authResponse.sessionId = session._id;
      }

      next();
    } catch (error) {
      console.error("[SessionTracker] Erro ao iniciar sessão:", error);
      next();
    }
  };
};
