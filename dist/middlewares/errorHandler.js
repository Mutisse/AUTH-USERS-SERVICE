"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const AppError_1 = require("../utils/AppError");
const chalk_1 = __importDefault(require("chalk"));
const notFoundHandler = (req, res, next) => {
    const error = new AppError_1.AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, req, res, next) => {
    const appError = error;
    console.error(chalk_1.default.red.bold(`[${new Date().toISOString()}] 🚨 Erro:`));
    console.error(chalk_1.default.red(`   → Rota: ${req.method} ${req.originalUrl}`));
    console.error(chalk_1.default.red(`   → IP: ${req.ip}`));
    console.error(chalk_1.default.red(`   → Erro: ${error.message}`));
    if (!(error instanceof AppError_1.AppError) || !error.isOperational) {
        console.error(chalk_1.default.red(`   → Stack: ${error.stack}`));
    }
    let response = {
        error: "Erro interno do servidor",
        message: "Algo deu errado",
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    };
    if (error instanceof AppError_1.AppError) {
        response.statusCode = appError.statusCode;
        response.error = getErrorTitle(appError.statusCode);
        response.message = appError.message;
        if (appError.code) {
            response.code = appError.code;
        }
        if (appError.details) {
            response.details = appError.details;
        }
        if (error.name === "ValidationErrors" && "errors" in error) {
            response.errors = error.errors;
        }
    }
    if (error.name === "MongoError" || error.name === "MongoServerError") {
        response.statusCode = 400;
        response.error = "Erro de banco de dados";
        response.message = handleMongoError(error);
    }
    if (error.name === "ValidationError") {
        response.statusCode = 400;
        response.error = "Erro de validação";
        response.message = handleMongooseValidationError(error);
    }
    if (error.name === "SyntaxError" && "body" in error) {
        response.statusCode = 400;
        response.error = "JSON inválido";
        response.message = "O corpo da requisição contém JSON malformado";
    }
    res.status(response.statusCode).json(response);
};
exports.errorHandler = errorHandler;
function getErrorTitle(statusCode) {
    const titles = {
        400: "Requisição inválida",
        401: "Não autorizado",
        403: "Acesso proibido",
        404: "Recurso não encontrado",
        409: "Conflito de dados",
        429: "Muitas requisições",
        500: "Erro interno do servidor",
        503: "Serviço indisponível",
    };
    return titles[statusCode] || "Erro";
}
function handleMongoError(error) {
    const code = error.code;
    if (code === 11000) {
        const field = Object.keys(error.keyValue || {})[0];
        const value = error.keyValue ? error.keyValue[field] : "valor";
        return `Já existe um registro com ${field}: ${value}`;
    }
    if (code === 121) {
        return "Documento falhou na validação";
    }
    return "Erro no banco de dados";
}
function handleMongooseValidationError(error) {
    const errors = Object.values(error.errors || {});
    if (errors.length > 0) {
        const firstError = errors[0];
        return firstError.message || "Erro de validação nos campos";
    }
    return "Dados de entrada inválidos";
}
