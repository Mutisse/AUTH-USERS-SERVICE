"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.notFoundHandler = void 0;
const AppError_1 = require("../utils/AppError");
const notFoundHandler = (req, res, next) => {
    const error = new AppError_1.AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const handleError = (error, req, res, next) => {
    const appError = error;
    if (error instanceof AppError_1.AppError) {
        res.status(appError.statusCode).json({
            success: false,
            error: appError.message,
            code: appError.code,
            details: appError.details
        });
        return;
    }
    console.error('💥 ERRO:', error);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
    });
};
exports.handleError = handleError;
