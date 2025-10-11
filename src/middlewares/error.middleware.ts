import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// ✅ CORREÇÃO: Interface para AppError com details
interface AppErrorWithDetails extends AppError {
  details?: any;
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

export const handleError = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  // ✅ CORREÇÃO: Fazer type casting
  const appError = error as AppErrorWithDetails;
  
  if (error instanceof AppError) {
    res.status(appError.statusCode).json({
      success: false,
      error: appError.message,
      code: appError.code,
      details: appError.details // ✅ Agora funciona
    });
    return; // ✅ CORREÇÃO: Adicionar return
  }

  console.error('💥 ERRO:', error);
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR'
  });
};