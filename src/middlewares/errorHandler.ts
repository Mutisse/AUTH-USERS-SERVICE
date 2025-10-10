import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { format } from 'date-fns';

const getTimestamp = () => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class DatabaseError extends AppError {
  constructor(message: string, public query?: string) {
    super(message, 503);
  }
}

class ValidationError extends AppError {
  constructor(public fieldErrors: Record<string, string[]>) {
    super("Validation failed", 400);
  }
}

class AuthError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
  }
}

const errorMessages: Record<string, string> = {
  ECONNRESET: "Conexão com o banco de dados foi reiniciada",
  ETIMEDOUT: "Tempo de conexão com o banco de dados expirado",
  ENOTFOUND: "Servidor de banco de dados não encontrado",
  EACCES: "Permissão negada no banco de dados",
  EAI_AGAIN: "Problema de DNS temporário",
  DEFAULT: "Erro interno no servidor"
};

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const timestamp = getTimestamp();
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = (err as any).code || 'INTERNAL_ERROR';
  
  // Log detalhado do erro
  console.error(chalk.red(`[${timestamp}] ERRO ${statusCode}:`));
  console.error(chalk.red(`Mensagem: ${err.message}`));
  console.error(chalk.red(`Tipo: ${err.name}`));
  console.error(chalk.red(`Endpoint: ${req.method} ${req.path}`));
  
  if (process.env.NODE_ENV === 'development') {
    console.error(chalk.red(`Stack: ${err.stack}`));
    if (err instanceof DatabaseError && err.query) {
      console.error(chalk.red(`Query: ${err.query}`));
    }
  }

  // Resposta para o cliente
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err instanceof AppError ? err.message : errorMessages[errorCode] || errorMessages.DEFAULT,
      ...(err instanceof ValidationError && { details: err.fieldErrors }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        ...(err instanceof DatabaseError && { query: err.query })
      }),
      timestamp
    }
  });
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const err = new AppError(`Endpoint não encontrado: ${req.method} ${req.path}`, 404);
  next(err);
}

export {
  AppError,
  DatabaseError,
  ValidationError,
  AuthError
};