import { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

interface ApiError extends Error {
    statusCode?: number;
    details?: any;
}

export function handleError(
    error: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error('Erro capturado:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Determinar o status code apropriado
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Erro interno no servidor';
    let details = error.details;

    // Tratamento específico para erros do MongoDB/Mongoose
    if (error instanceof MongoServerError) {
        statusCode = 400;
        if (error.code === 11000) {
            message = 'Erro de duplicação de dados';
            details = { duplicatedFields: error.keyValue };
        }
    } else if (error instanceof MongooseError.ValidationError) {
        statusCode = 422;
        message = 'Erro de validação';
        details = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
        }));
    }

    // Resposta de erro padrão
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
}

// Middleware para capturar erros assíncronos
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}