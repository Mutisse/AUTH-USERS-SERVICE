export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = "Requisição inválida", code?: string) {
    return new AppError(message, 400, code);
  }

  static unauthorized(message: string = "Não autorizado", code?: string) {
    return new AppError(message, 401, code);
  }

  static forbidden(message: string = "Acesso proibido", code?: string) {
    return new AppError(message, 403, code);
  }

  static notFound(message: string = "Recurso não encontrado", code?: string) {
    return new AppError(message, 404, code);
  }

  static conflict(message: string = "Conflito de dados", code?: string) {
    return new AppError(message, 409, code);
  }

  static internalError(
    message: string = "Erro interno do servidor",
    code?: string
  ) {
    return new AppError(message, 500, code);
  }

  static serviceUnavailable(
    message: string = "Serviço indisponível",
    code?: string
  ) {
    return new AppError(message, 503, code);
  }
}

export class AppErrors extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}
