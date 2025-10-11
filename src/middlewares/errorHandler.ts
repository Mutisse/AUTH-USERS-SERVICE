import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import chalk from "chalk";

// Interface para resposta de erro padronizada
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  [key: string]: any; // ✅ CORREÇÃO: para propriedades adicionais
}

// ✅ CORREÇÃO: Adicionar interface para AppError com propriedade details
interface AppErrorWithDetails extends AppError {
  details?: any;
  code?: string;
}

// Middleware para rotas não encontradas
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new AppError(
    `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    404
  );
  next(error);
};

// Middleware centralizado de tratamento de erros
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ✅ CORREÇÃO: Fazer type casting para AppErrorWithDetails
  const appError = error as AppErrorWithDetails;

  // Log do erro
  console.error(chalk.red.bold(`[${new Date().toISOString()}] 🚨 Erro:`));
  console.error(chalk.red(`   → Rota: ${req.method} ${req.originalUrl}`));
  console.error(chalk.red(`   → IP: ${req.ip}`));
  console.error(chalk.red(`   → Erro: ${error.message}`));

  if (!(error instanceof AppError) || !(error as any).isOperational) {
    console.error(chalk.red(`   → Stack: ${error.stack}`));
  }

  // Resposta padrão
  let response: ErrorResponse = {
    error: "Erro interno do servidor",
    message: "Algo deu errado",
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // ✅ CORREÇÃO: Usar appError com propriedades corrigidas
  if (error instanceof AppError) {
    response.statusCode = appError.statusCode;
    response.error = getErrorTitle(appError.statusCode);
    response.message = appError.message;

    // ✅ CORREÇÃO: Adicionar code e details se existirem
    if (appError.code) {
      (response as any).code = appError.code;
    }

    if (appError.details) {
      (response as any).details = appError.details;
    }

    // Adiciona erros de validação específicos se for ValidationErrors
    if (error.name === "ValidationErrors" && "errors" in error) {
      (response as any).errors = (error as any).errors;
    }
  }

  // Erros do Mongoose
  if (error.name === "MongoError" || error.name === "MongoServerError") {
    response.statusCode = 400;
    response.error = "Erro de banco de dados";
    response.message = handleMongoError(error);
  }

  // Erros de validação do Mongoose
  if (error.name === "ValidationError") {
    response.statusCode = 400;
    response.error = "Erro de validação";
    response.message = handleMongooseValidationError(error);
  }

  // Erros de sintaxe JSON
  if (error.name === "SyntaxError" && "body" in error) {
    response.statusCode = 400;
    response.error = "JSON inválido";
    response.message = "O corpo da requisição contém JSON malformado";
  }

  // Resposta final
  res.status(response.statusCode).json(response);
};

// Função para obter título do erro baseado no status code
function getErrorTitle(statusCode: number): string {
  const titles: { [key: number]: string } = {
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

// Tratamento específico para erros do MongoDB
function handleMongoError(error: any): string {
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

// Tratamento específico para erros de validação do Mongoose
function handleMongooseValidationError(error: any): string {
  const errors = Object.values(error.errors || {});

  if (errors.length > 0) {
    const firstError = errors[0] as any;
    return firstError.message || "Erro de validação nos campos";
  }

  return "Dados de entrada inválidos";
}
