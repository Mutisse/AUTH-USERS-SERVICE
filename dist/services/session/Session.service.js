"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const Session_model_1 = require("../../models/session/Session.model");
const SessionActivity_model_1 = require("../../models/session/SessionActivity.model");
const generateCustomId_1 = require("../../utils/generateCustomId");
const ua_parser_js_1 = require("ua-parser-js");
class SessionService {
    async createSession(userData, tokenData, requestInfo) {
        try {
            const sessionId = (0, generateCustomId_1.generateCustomSessionId)();
            const parser = new ua_parser_js_1.UAParser(requestInfo.userAgent);
            const deviceInfo = parser.getResult();
            let deviceType = "unknown";
            if (deviceInfo.device.type === "mobile")
                deviceType = "mobile";
            else if (deviceInfo.device.type === "tablet")
                deviceType = "tablet";
            else if (deviceInfo.device.type === undefined)
                deviceType = "desktop";
            const sessionData = {
                _id: sessionId,
                ...userData,
                loginAt: new Date(),
                lastActivity: new Date(),
                status: "online",
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
                    country: "Unknown",
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
            const session = await Session_model_1.SessionModel.create(sessionData);
            await this.recordActivity({
                sessionId,
                userId: userData.userId,
                action: "login",
                details: {
                    userAgent: requestInfo.userAgent,
                    ip: requestInfo.ip,
                },
            });
            console.log(`✅ Nova sessão criada: ${sessionId} para usuário: ${userData.userEmail}`);
            return session;
        }
        catch (error) {
            console.error("[SessionService] Erro ao criar sessão:", error);
            throw error;
        }
    }
    async updateSessionActivity(sessionId, activityData) {
        try {
            const session = await Session_model_1.SessionModel.findByIdAndUpdate(sessionId, {
                $set: { lastActivity: new Date() },
                $inc: { activityCount: 1 },
            }, { new: true });
            if (session) {
                await this.recordActivity({
                    sessionId,
                    userId: session.userId,
                    action: "activity",
                    details: activityData,
                });
            }
            return session;
        }
        catch (error) {
            console.error("[SessionService] Erro ao atualizar atividade:", error);
            throw error;
        }
    }
    async logoutSession(sessionId, logoutData) {
        try {
            const session = await Session_model_1.SessionModel.findById(sessionId);
            if (!session) {
                throw new Error("Sessão não encontrada");
            }
            const logoutAt = new Date();
            const duration = Math.round((logoutAt.getTime() - session.loginAt.getTime()) / (1000 * 60));
            const updatedSession = await Session_model_1.SessionModel.findByIdAndUpdate(sessionId, {
                $set: {
                    logoutAt,
                    status: "offline",
                    duration,
                },
            }, { new: true });
            await this.recordActivity({
                sessionId,
                userId: session.userId,
                action: "logout",
                details: {
                    ...logoutData,
                    reason: logoutData?.reason || "manual",
                },
            });
            console.log(`✅ Sessão finalizada: ${sessionId} - Duração: ${duration} minutos`);
            return updatedSession;
        }
        catch (error) {
            console.error("[SessionService] Erro ao fazer logout:", error);
            throw error;
        }
    }
    async getUserActiveSessions(userId) {
        try {
            const sessions = await Session_model_1.SessionModel.find({
                userId,
                status: "online",
            }).sort({ lastActivity: -1 });
            return sessions;
        }
        catch (error) {
            console.error("[SessionService] Erro ao buscar sessões ativas:", error);
            throw error;
        }
    }
    async getSessionHistory(userId, limit = 10) {
        try {
            const sessions = await Session_model_1.SessionModel.find({ userId })
                .sort({ loginAt: -1 })
                .limit(limit);
            return sessions;
        }
        catch (error) {
            console.error("[SessionService] Erro ao buscar histórico:", error);
            throw error;
        }
    }
    async terminateAllUserSessions(userId, reason = "admin_action") {
        try {
            const activeSessions = await Session_model_1.SessionModel.find({
                userId,
                status: "online",
            });
            const logoutPromises = activeSessions.map((session) => this.logoutSession(session._id, { reason }));
            await Promise.all(logoutPromises);
            console.log(`✅ Todas as sessões terminadas para usuário: ${userId}`);
            return { terminated: activeSessions.length };
        }
        catch (error) {
            console.error("[SessionService] Erro ao terminar sessões:", error);
            throw error;
        }
    }
    async checkExpiredSessions() {
        try {
            const expiredSessions = await Session_model_1.SessionModel.find({
                status: "online",
                tokenExpiresAt: { $lt: new Date() },
            });
            const logoutPromises = expiredSessions.map((session) => this.logoutSession(session._id, { reason: "token_expired" }));
            await Promise.all(logoutPromises);
            console.log(`✅ Sessões expiradas verificadas: ${expiredSessions.length} sessões terminadas`);
            return { expired: expiredSessions.length };
        }
        catch (error) {
            console.error("[SessionService] Erro ao verificar sessões expiradas:", error);
            throw error;
        }
    }
    async getSessionStats(userId) {
        try {
            const matchStage = {};
            if (userId) {
                matchStage.userId = userId;
            }
            const stats = await Session_model_1.SessionModel.aggregate([
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
            return (stats[0] || {
                totalSessions: 0,
                activeSessions: 0,
                averageDuration: 0,
                totalActivity: 0,
            });
        }
        catch (error) {
            console.error("[SessionService] Erro ao buscar estatísticas:", error);
            throw error;
        }
    }
    async recordActivity(activityData) {
        try {
            const activityId = (0, generateCustomId_1.generateCustomSessionId)();
            await SessionActivity_model_1.SessionActivityModel.create({
                _id: activityId,
                ...activityData,
                timestamp: new Date(),
            });
        }
        catch (error) {
            console.error("[SessionService] Erro ao registrar atividade:", error);
        }
    }
}
exports.SessionService = SessionService;
