import { SessionModel } from "../../models/session/Session.model";
import { SessionActivityModel } from "../../models/session/SessionActivity.model";
import { generateCustomSessionId } from "../../utils/generateCustomId";
import { UAParser } from "ua-parser-js";

export class SessionService {
  // 🎯 CRIAR NOVA SESSÃO
  public async createSession(
    userData: {
      userId: string;
      userRole: string;
      userEmail: string;
      userName: string;
    },
    tokenData: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    },
    requestInfo: {
      ip: string;
      userAgent: string;
      isSecure: boolean;
    }
  ) {
    try {
      const sessionId = generateCustomSessionId();
      const parser = new UAParser(requestInfo.userAgent);
      const deviceInfo = parser.getResult();

      // Determinar tipo de dispositivo
      let deviceType: "mobile" | "tablet" | "desktop" | "unknown" = "unknown";
      if (deviceInfo.device.type === "mobile") deviceType = "mobile";
      else if (deviceInfo.device.type === "tablet") deviceType = "tablet";
      else if (deviceInfo.device.type === undefined) deviceType = "desktop";

      const sessionData = {
        _id: sessionId,
        ...userData,
        loginAt: new Date(),
        lastActivity: new Date(),
        status: "online" as const,
        device: {
          type: deviceType,
          browser: deviceInfo.browser.name || "Unknown",
          browserVersion: deviceInfo.browser.version || "Unknown",
          os: deviceInfo.os.name || "Unknown",
          osVersion: deviceInfo.os.version || "Unknown",
          platform: deviceInfo.device.vendor || "Unknown",
        },
        location: {
          ip: requestInfo.ip,
          country: "Unknown", // Poderia integrar com API de geolocalização
          city: "Unknown",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        security: {
          userAgent: requestInfo.userAgent,
          isSecure: requestInfo.isSecure,
          tokenVersion: 1,
        },
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
        activityCount: 1,
      };

      const session = await SessionModel.create(sessionData);

      // 🎯 REGISTRAR ATIVIDADE DE LOGIN
      await this.recordActivity({
        sessionId,
        userId: userData.userId,
        action: "login",
        details: {
          userAgent: requestInfo.userAgent,
          ip: requestInfo.ip,
        },
      });

      console.log(
        `✅ Nova sessão criada: ${sessionId} para usuário: ${userData.userEmail}`
      );
      return session;
    } catch (error) {
      console.error("[SessionService] Erro ao criar sessão:", error);
      throw error;
    }
  }

  // 🎯 ATUALIZAR ATIVIDADE DA SESSÃO
  public async updateSessionActivity(
    sessionId: string,
    activityData?: {
      route?: string;
      method?: string;
      ip?: string;
      userAgent?: string;
    }
  ) {
    try {
      const session = await SessionModel.findByIdAndUpdate(
        sessionId,
        {
          $set: { lastActivity: new Date() },
          $inc: { activityCount: 1 },
        },
        { new: true }
      );

      if (session) {
        // 🎯 REGISTRAR ATIVIDADE
        await this.recordActivity({
          sessionId,
          userId: session.userId,
          action: "activity",
          details: activityData,
        });
      }

      return session;
    } catch (error) {
      console.error("[SessionService] Erro ao atualizar atividade:", error);
      throw error;
    }
  }

  // 🎯 LOGOUT DA SESSÃO
  public async logoutSession(
    sessionId: string,
    logoutData?: {
      ip?: string;
      userAgent?: string;
      reason?: string;
    }
  ) {
    try {
      const session = await SessionModel.findById(sessionId);
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      const logoutAt = new Date();
      const duration = Math.round(
        (logoutAt.getTime() - session.loginAt.getTime()) / (1000 * 60)
      ); // minutos

      const updatedSession = await SessionModel.findByIdAndUpdate(
        sessionId,
        {
          $set: {
            logoutAt,
            status: "offline",
            duration,
          },
        },
        { new: true }
      );

      // 🎯 REGISTRAR ATIVIDADE DE LOGOUT
      await this.recordActivity({
        sessionId,
        userId: session.userId,
        action: "logout",
        details: {
          ...logoutData,
          reason: logoutData?.reason || "manual",
        },
      });

      console.log(
        `✅ Sessão finalizada: ${sessionId} - Duração: ${duration} minutos`
      );
      return updatedSession;
    } catch (error) {
      console.error("[SessionService] Erro ao fazer logout:", error);
      throw error;
    }
  }

  // 🎯 OBTER SESSÕES ATIVAS DO USUÁRIO
  public async getUserActiveSessions(userId: string) {
    try {
      const sessions = await SessionModel.find({
        userId,
        status: "online",
      }).sort({ lastActivity: -1 });

      return sessions;
    } catch (error) {
      console.error("[SessionService] Erro ao buscar sessões ativas:", error);
      throw error;
    }
  }

  // 🎯 OBTER HISTÓRICO DE SESSÕES
  public async getSessionHistory(userId: string, limit: number = 10) {
    try {
      const sessions = await SessionModel.find({ userId })
        .sort({ loginAt: -1 })
        .limit(limit);

      return sessions;
    } catch (error) {
      console.error("[SessionService] Erro ao buscar histórico:", error);
      throw error;
    }
  }

  // 🎯 TERMINAR TODAS AS SESSÕES DO USUÁRIO
  public async terminateAllUserSessions(
    userId: string,
    reason: string = "admin_action"
  ) {
    try {
      const activeSessions = await SessionModel.find({
        userId,
        status: "online",
      });

      const logoutPromises = activeSessions.map((session) =>
        this.logoutSession(session._id, { reason })
      );

      await Promise.all(logoutPromises);

      console.log(`✅ Todas as sessões terminadas para usuário: ${userId}`);
      return { terminated: activeSessions.length };
    } catch (error) {
      console.error("[SessionService] Erro ao terminar sessões:", error);
      throw error;
    }
  }

  // 🎯 VERIFICAR SESSÃO EXPIRADA
  public async checkExpiredSessions() {
    try {
      const expiredSessions = await SessionModel.find({
        status: "online",
        tokenExpiresAt: { $lt: new Date() },
      });

      const logoutPromises = expiredSessions.map((session) =>
        this.logoutSession(session._id, { reason: "token_expired" })
      );

      await Promise.all(logoutPromises);

      console.log(
        `✅ Sessões expiradas verificadas: ${expiredSessions.length} sessões terminadas`
      );
      return { expired: expiredSessions.length };
    } catch (error) {
      console.error(
        "[SessionService] Erro ao verificar sessões expiradas:",
        error
      );
      throw error;
    }
  }

  // 🎯 OBTER ESTATÍSTICAS DE SESSÃO
  public async getSessionStats(userId?: string) {
    try {
      const matchStage: any = {};
      if (userId) {
        matchStage.userId = userId;
      }

      const stats = await SessionModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] },
            },
            averageDuration: { $avg: "$duration" },
            totalActivity: { $sum: "$activityCount" },
          },
        },
      ]);

      return (
        stats[0] || {
          totalSessions: 0,
          activeSessions: 0,
          averageDuration: 0,
          totalActivity: 0,
        }
      );
    } catch (error) {
      console.error("[SessionService] Erro ao buscar estatísticas:", error);
      throw error;
    }
  }

  // 🎯 REGISTRAR ATIVIDADE (MÉTODO PRIVADO)
  private async recordActivity(activityData: {
    sessionId: string;
    userId: string;
    action: string;
    details?: any;
  }) {
    try {
      const activityId = generateCustomSessionId();

      await SessionActivityModel.create({
        _id: activityId,
        ...activityData,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("[SessionService] Erro ao registrar atividade:", error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }
}
