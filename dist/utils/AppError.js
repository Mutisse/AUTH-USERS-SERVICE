"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppErrors = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, code, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.name = "AppError";
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message = "Requisição inválida", code) {
        return new AppError(message, 400, code);
    }
    static unauthorized(message = "Não autorizado", code) {
        return new AppError(message, 401, code);
    }
    static forbidden(message = "Acesso proibido", code) {
        return new AppError(message, 403, code);
    }
    static notFound(message = "Recurso não encontrado", code) {
        return new AppError(message, 404, code);
    }
    static conflict(message = "Conflito de dados", code) {
        return new AppError(message, 409, code);
    }
    static internalError(message = "Erro interno do servidor", code) {
        return new AppError(message, 500, code);
    }
    static serviceUnavailable(message = "Serviço indisponível", code) {
        return new AppError(message, 503, code);
    }
}
exports.AppError = AppError;
class AppErrors extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppErrors = AppErrors;
