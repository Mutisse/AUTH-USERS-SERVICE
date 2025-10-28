"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = void 0;
const Session_service_1 = require("../../services/session/Session.service");
const AppError_1 = require("../../utils/AppError");
class SessionController {
    constructor() {
        this.getActiveSessions = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHENTICATED");
                }
                const sessions = await this.sessionService.getUserActiveSessions(userId);
                return res.status(200).json({
                    success: true,
                    data: sessions,
                    total: sessions.length,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.getSessionHistory = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                const { limit = 10 } = req.query;
                if (!userId) {
                    throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHENTICATED");
                }
                const sessions = await this.sessionService.getSessionHistory(userId, Number(limit));
                return res.status(200).json({
                    success: true,
                    data: sessions,
                    total: sessions.length,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.terminateSession = async (req, res, next) => {
            try {
                const { sessionId } = req.params;
                const currentUserId = req.user?.id;
                const session = await this.sessionService.logoutSession(sessionId, {
                    reason: "manual_termination",
                    ip: req.ip || "unknown",
                    userAgent: req.get("User-Agent") || "unknown",
                });
                if (!session || session.userId !== currentUserId) {
                    throw new AppError_1.AppError("Não autorizado", 403, "UNAUTHORIZED");
                }
                return res.status(200).json({
                    success: true,
                    message: "Sessão terminada com sucesso",
                    data: session,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.terminateAllSessions = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHENTICATED");
                }
                const result = await this.sessionService.terminateAllUserSessions(userId, "user_request");
                return res.status(200).json({
                    success: true,
                    message: `${result.terminated} sessões terminadas`,
                    data: result,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.getSessionStats = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                const stats = await this.sessionService.getSessionStats(userId);
                return res.status(200).json({
                    success: true,
                    data: stats,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.sessionService = new Session_service_1.SessionService();
    }
}
exports.SessionController = SessionController;
