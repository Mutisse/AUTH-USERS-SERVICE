import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { UserMainRole } from "../models/interfaces/user.roles";
import { verifyToken } from "../utils/jwt.utils";

// 🎯 INTERFACE EXTENDIDA DO REQUEST
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserMainRole;
        subRole?: string;
        isVerified: boolean;
      };
    }
  }
}

// 🎯 MIDDLEWARE DE AUTENTICAÇÃO
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new AppError(
        "Token de autenticação não fornecido",
        401,
        "MISSING_TOKEN"
      );
    }

    const payload = verifyToken(token);

    if (payload.type !== "access") {
      throw new AppError("Tipo de token inválido", 401, "INVALID_TOKEN_TYPE");
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      subRole: payload.subRole,
      isVerified: payload.isVerified,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expirado")) {
        throw new AppError("Token expirado", 401, "TOKEN_EXPIRED");
      }
      if (error.message.includes("inválido")) {
        throw new AppError("Token inválido", 401, "INVALID_TOKEN");
      }
    }
    next(new AppError("Erro de autenticação", 401, "AUTH_ERROR"));
  }
};

// 🎯 MIDDLEWARE DE AUTORIZAÇÃO POR ROLE
export const authorize = (...allowedRoles: UserMainRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          "Não autorizado para esta ação",
          403,
          "UNAUTHORIZED"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// 🎯 VERIFICAÇÃO DE EMAIL
export const requireVerification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
    }

    if (!req.user.isVerified) {
      throw new AppError("Email não verificado", 403, "EMAIL_NOT_VERIFIED");
    }

    next();
  } catch (error) {
    next(error);
  }
};

// 🎯 MIDDLEWARES ESPECÍFICOS
export const requireAdmin = authorize(UserMainRole.ADMINSYSTEM);
export const requireEmployee = authorize(UserMainRole.EMPLOYEE);
export const requireClient = authorize(UserMainRole.CLIENT);

// 🎯 MIDDLEWARE PARA EMPLOYEE OU ADMIN
export const requireStaff = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
    }

    if (
      req.user.role !== UserMainRole.EMPLOYEE &&
      req.user.role !== UserMainRole.ADMINSYSTEM
    ) {
      throw new AppError(
        "Acesso restrito a funcionários e administradores",
        403,
        "STAFF_ONLY"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
