"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTokenStructure = exports.getTokenRemainingTime = exports.isTokenExpired = exports.refreshAccessToken = exports.generateTokenPair = exports.decodeToken = exports.verifyToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key-32-chars",
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-32-chars",
    ACCESS_EXPIRES: process.env.JWT_EXPIRES_IN || "1h",
    REFRESH_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    ISSUER: "beautytime-api",
};
const generateAccessToken = (payload) => {
    const tokenPayload = {
        ...payload,
        type: "access",
    };
    return jsonwebtoken_1.default.sign(tokenPayload, JWT_CONFIG.SECRET, {
        expiresIn: JWT_CONFIG.ACCESS_EXPIRES,
        issuer: JWT_CONFIG.ISSUER,
        subject: payload.id,
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    const tokenPayload = {
        ...payload,
        type: "refresh",
    };
    return jsonwebtoken_1.default.sign(tokenPayload, JWT_CONFIG.REFRESH_SECRET, {
        expiresIn: JWT_CONFIG.REFRESH_EXPIRES,
        issuer: JWT_CONFIG.ISSUER,
        subject: payload.id,
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyToken = (token, tokenType = "access") => {
    try {
        const secret = tokenType === "access" ? JWT_CONFIG.SECRET : JWT_CONFIG.REFRESH_SECRET;
        return jsonwebtoken_1.default.verify(token, secret, {
            issuer: JWT_CONFIG.ISSUER,
        });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("Token expirado");
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error("Token inválido");
        }
        throw error;
    }
};
exports.verifyToken = verifyToken;
const decodeToken = (token) => {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (error) {
        return null;
    }
};
exports.decodeToken = decodeToken;
const generateTokenPair = (userData) => {
    const accessToken = (0, exports.generateAccessToken)({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        subRole: userData.subRole,
        isVerified: userData.isVerified,
        sessionId: userData.sessionId,
    });
    const refreshToken = (0, exports.generateRefreshToken)({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        subRole: userData.subRole,
        isVerified: userData.isVerified,
        sessionId: userData.sessionId,
    });
    const parseExpiresIn = (expiresIn) => {
        const unit = expiresIn.slice(-1);
        const value = parseInt(expiresIn.slice(0, -1));
        switch (unit) {
            case "s":
                return value;
            case "m":
                return value * 60;
            case "h":
                return value * 60 * 60;
            case "d":
                return value * 24 * 60 * 60;
            default:
                return 3600;
        }
    };
    const expiresInSeconds = parseExpiresIn(JWT_CONFIG.ACCESS_EXPIRES);
    return {
        accessToken,
        refreshToken,
        expiresIn: expiresInSeconds,
    };
};
exports.generateTokenPair = generateTokenPair;
const refreshAccessToken = (refreshToken) => {
    try {
        const payload = (0, exports.verifyToken)(refreshToken, "refresh");
        if (payload.type !== "refresh") {
            throw new Error("Token não é um refresh token");
        }
        const newAccessToken = (0, exports.generateAccessToken)({
            id: payload.id,
            email: payload.email,
            role: payload.role,
            subRole: payload.subRole,
            isVerified: payload.isVerified,
            sessionId: payload.sessionId,
        });
        const parseExpiresIn = (expiresIn) => {
            const unit = expiresIn.slice(-1);
            const value = parseInt(expiresIn.slice(0, -1));
            switch (unit) {
                case "s":
                    return value;
                case "m":
                    return value * 60;
                case "h":
                    return value * 60 * 60;
                case "d":
                    return value * 24 * 60 * 60;
                default:
                    return 3600;
            }
        };
        const expiresInSeconds = parseExpiresIn(JWT_CONFIG.ACCESS_EXPIRES);
        return {
            accessToken: newAccessToken,
            expiresIn: expiresInSeconds,
        };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Refresh token inválido: ${error.message}`);
        }
        throw new Error("Refresh token inválido");
    }
};
exports.refreshAccessToken = refreshAccessToken;
const isTokenExpired = (token) => {
    try {
        const payload = (0, exports.decodeToken)(token);
        if (!payload || !payload.exp)
            return true;
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    }
    catch (error) {
        return true;
    }
};
exports.isTokenExpired = isTokenExpired;
const getTokenRemainingTime = (token) => {
    try {
        const payload = (0, exports.decodeToken)(token);
        if (!payload || !payload.exp)
            return 0;
        const currentTime = Math.floor(Date.now() / 1000);
        return Math.max(0, payload.exp - currentTime);
    }
    catch (error) {
        return 0;
    }
};
exports.getTokenRemainingTime = getTokenRemainingTime;
const validateTokenStructure = (token) => {
    try {
        const parts = token.split(".");
        return parts.length === 3;
    }
    catch (error) {
        return false;
    }
};
exports.validateTokenStructure = validateTokenStructure;
