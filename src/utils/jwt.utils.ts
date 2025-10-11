import jwt from "jsonwebtoken";
import { UserMainRole } from "../models/interfaces/user.roles";

// 🎯 CONFIGURAÇÕES JWT
const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key-32-chars",
  REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-32-chars",
  ACCESS_EXPIRES: process.env.JWT_EXPIRES_IN || "1h",
  REFRESH_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  ISSUER: "beautytime-api",
};

// 🎯 INTERFACE DO PAYLOAD JWT
export interface JwtPayload {
  id: string;
  email: string;
  role: UserMainRole;
  subRole?: string;
  isVerified: boolean;
  sessionId?: string;
  type: "access" | "refresh";
  exp?: number;
  iat?: number;
}

// 🎯 GERAR TOKEN DE ACESSO
export const generateAccessToken = (
  payload: Omit<JwtPayload, "type">
): string => {
  const tokenPayload: JwtPayload = {
    ...payload,
    type: "access",
  };

  return jwt.sign(
    tokenPayload,
    JWT_CONFIG.SECRET,
    {
      expiresIn: JWT_CONFIG.ACCESS_EXPIRES,
      issuer: JWT_CONFIG.ISSUER,
      subject: payload.id,
    } as jwt.SignOptions // ✅ CORREÇÃO: Adicionar tipo SignOptions
  );
};

// 🎯 GERAR TOKEN DE REFRESH
export const generateRefreshToken = (
  payload: Omit<JwtPayload, "type">
): string => {
  const tokenPayload: JwtPayload = {
    ...payload,
    type: "refresh",
  };

  return jwt.sign(
    tokenPayload,
    JWT_CONFIG.REFRESH_SECRET,
    {
      expiresIn: JWT_CONFIG.REFRESH_EXPIRES,
      issuer: JWT_CONFIG.ISSUER,
      subject: payload.id,
    } as jwt.SignOptions // ✅ CORREÇÃO: Adicionar tipo SignOptions
  );
};

// 🎯 VERIFICAR TOKEN
export const verifyToken = (
  token: string,
  tokenType: "access" | "refresh" = "access"
): JwtPayload => {
  try {
    const secret =
      tokenType === "access" ? JWT_CONFIG.SECRET : JWT_CONFIG.REFRESH_SECRET;

    return jwt.verify(token, secret, {
      issuer: JWT_CONFIG.ISSUER,
    } as jwt.VerifyOptions) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expirado");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Token inválido");
    }
    throw error;
  }
};

// 🎯 EXTRAIR DADOS DO TOKEN SEM VERIFICAR
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};

// 🎯 GERAR PAR DE TOKENS
export const generateTokenPair = (userData: {
  id: string;
  email: string;
  role: string;
  subRole?: string;
  isVerified: boolean;
  sessionId?: string;
}) => {
  const accessToken = generateAccessToken({
    id: userData.id,
    email: userData.email,
    role: userData.role as UserMainRole,
    subRole: userData.subRole,
    isVerified: userData.isVerified,
    sessionId: userData.sessionId,
  });

  const refreshToken = generateRefreshToken({
    id: userData.id,
    email: userData.email,
    role: userData.role as UserMainRole,
    subRole: userData.subRole,
    isVerified: userData.isVerified,
    sessionId: userData.sessionId,
  });

  // ✅ CORREÇÃO: Converter expiresIn para segundos de forma segura
  const parseExpiresIn = (expiresIn: string): number => {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case "s":
        return value; // segundos
      case "m":
        return value * 60; // minutos
      case "h":
        return value * 60 * 60; // horas
      case "d":
        return value * 24 * 60 * 60; // dias
      default:
        return 3600; // padrão 1 hora
    }
  };

  const expiresInSeconds = parseExpiresIn(JWT_CONFIG.ACCESS_EXPIRES);

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInSeconds,
  };
};

// 🎯 REFRESH TOKEN
export const refreshAccessToken = (refreshToken: string) => {
  try {
    const payload = verifyToken(refreshToken, "refresh");

    if (payload.type !== "refresh") {
      throw new Error("Token não é um refresh token");
    }

    const newAccessToken = generateAccessToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      subRole: payload.subRole,
      isVerified: payload.isVerified,
      sessionId: payload.sessionId,
    });

    // ✅ CORREÇÃO: Converter expiresIn para segundos de forma segura
    const parseExpiresIn = (expiresIn: string): number => {
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Refresh token inválido: ${error.message}`);
    }
    throw new Error("Refresh token inválido");
  }
};

// 🎯 VERIFICAR SE O TOKEN ESTÁ EXPIRADO
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// 🎯 OBTER TEMPO RESTANTE DO TOKEN
export const getTokenRemainingTime = (token: string): number => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  } catch (error) {
    return 0;
  }
};

// 🎯 VALIDAR ESTRUTURA DO TOKEN (UTILITÁRIO)
export const validateTokenStructure = (token: string): boolean => {
  try {
    const parts = token.split(".");
    return parts.length === 3;
  } catch (error) {
    return false;
  }
};
