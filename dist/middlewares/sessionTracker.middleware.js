"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSessionTracking = exports.sessionTracker = void 0;
const Session_service_1 = require("../services/session/Session.service");
const sessionService = new Session_service_1.SessionService();
const sessionTracker = async (req, res, next) => {
    try {
        if (req.user) {
            const sessionId = req.headers["x-session-id"];
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
    }
    catch (error) {
        console.error("[SessionTracker] Erro no tracking:", error);
        next();
    }
};
exports.sessionTracker = sessionTracker;
const startSessionTracking = (userData, tokenData) => {
    return async (req, res, next) => {
        try {
            const session = await sessionService.createSession(userData, tokenData, {
                ip: req.ip || "unknown",
                userAgent: req.get("User-Agent") || "unknown",
                isSecure: req.secure,
            });
            res.set("X-Session-ID", session._id);
            if (res.locals.authResponse) {
                res.locals.authResponse.sessionId = session._id;
            }
            next();
        }
        catch (error) {
            console.error("[SessionTracker] Erro ao iniciar sessão:", error);
            next();
        }
    };
};
exports.startSessionTracking = startSessionTracking;
