import { Request, Response, NextFunction } from "express";
import { ClientService } from "../../../services/user/client/Client.service";
import { OTPService } from "../../../services/otp/OTP.service";
import { AppError } from "../../../utils/AppError";
import { generateTokenPair } from "../../../utils/jwt.utils";

export class ClientController {
  private clientService: ClientService;
  private otpService: OTPService;

  constructor() {
    this.clientService = new ClientService();
    this.otpService = new OTPService();
  }

  // 🎯 REGISTRO DE CLIENTE COM VERIFICAÇÃO OTP
  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientData = req.body;

      // Validações básicas
      if (!clientData.email || !clientData.password) {
        throw new AppError(
          "Email e senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      if (!clientData.fullName?.firstName) {
        throw new AppError("Nome é obrigatório", 400, "MISSING_NAME");
      }

      // 🎯 VERIFICAR SE EMAIL ESTÁ VERIFICADO VIA OTP
      const otpStatus = this.otpService.getOTPStatus(clientData.email);

      if (!otpStatus.exists) {
        throw new AppError(
          "Email não verificado. Solicite um código OTP primeiro.",
          403,
          "EMAIL_NOT_VERIFIED"
        );
      }

      if (!otpStatus.verified) {
        throw new AppError(
          "Email não verificado. Complete a verificação com o código OTP.",
          403,
          "EMAIL_NOT_VERIFIED"
        );
      }

      // 🎯 CRIAR CLIENTE
      const result = await this.clientService.createClient(clientData);

      if (!result.success) {
        return res.status(result.statusCode).json(result); // ✅ Adicionar return
      }

      // 🎯 INVALIDAR OTP APÓS REGISTRO BEM-SUCEDIDO
      this.otpService.invalidateOTP(clientData.email);

      // 🎯 GERAR TOKENS JWT
      const tokenPair = generateTokenPair({
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        isVerified: result.data!.isVerified,
      });

      const responseWithToken = {
        ...result,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };

      return res.status(201).json(responseWithToken); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 LOGIN DE CLIENTE
  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(
          "Email e senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const result = await this.clientService.authenticate(email, password);

      if (!result.success) {
        const statusCode = result.code === "ACCOUNT_LOCKED" ? 423 : 401;
        return res.status(statusCode).json(result); // ✅ Adicionar return
      }

      // 🎯 GERAR TOKENS JWT
      const tokenPair = generateTokenPair({
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        isVerified: result.data!.isVerified,
      });

      const responseWithToken = {
        ...result,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };

      return res.status(200).json(responseWithToken); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 PERFIL DO CLIENTE
  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;

      if (!clientId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.clientService.getProfile(clientId);
      return res.status(result.statusCode).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 ATUALIZAR PERFIL
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;
      const updates = req.body;

      if (!clientId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.clientService.updateProfile(clientId, updates);
      return res.status(result.statusCode).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 ATUALIZAR PREFERÊNCIAS
  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;
      const preferences = req.body;

      if (!clientId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.clientService.updatePreferences(
        clientId,
        preferences
      );
      return res.status(result.statusCode).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 ATUALIZAR PONTOS DE FIDELIDADE
  public updateLoyaltyPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const { points } = req.body;

      if (typeof points !== "number") {
        throw new AppError("Pontos devem ser um número", 400, "INVALID_POINTS");
      }

      // 🎯 VERIFICAR SE USUÁRIO TEM ACESSO
      const currentUser = (req as any).user;
      if (currentUser.id !== clientId && currentUser.role !== "admin_system") {
        throw new AppError("Não autorizado", 403, "UNAUTHORIZED");
      }

      const result = await this.clientService.updateLoyaltyPoints(
        clientId,
        points
      );
      return res.status(result.statusCode).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 REGISTRAR ATENDIMENTO
  public recordAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      // 🎯 VERIFICAR SE USUÁRIO TEM ACESSO
      const currentUser = (req as any).user;
      if (
        currentUser.id !== clientId &&
        currentUser.role !== "admin_system" &&
        currentUser.role !== "employee"
      ) {
        throw new AppError("Não autorizado", 403, "UNAUTHORIZED");
      }

      const result = await this.clientService.recordAppointment(clientId);
      return res.status(result.statusCode).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 SOLICITAR OTP PARA CLIENTE
  public requestOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const result = await this.otpService.sendOTP(email, "registration", name);

      if (!result.success) {
        throw new AppError(
          `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
          429,
          "OTP_RATE_LIMITED"
        );
      }

      return res.status(200).json({ // ✅ Adicionar return
        success: true,
        message: "Código de verificação enviado para seu email",
        data: {
          email,
          purpose: "registration",
          expiresIn: "10 minutos",
        },
      });
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 VERIFICAR OTP PARA CLIENTE
  public verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new AppError(
          "Email e código são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const result = await this.otpService.verifyOTP(
        email,
        code,
        "registration"
      );

      if (!result.success) {
        throw new AppError(result.message, 400, "OTP_VERIFICATION_FAILED");
      }

      return res.status(200).json({ // ✅ Adicionar return
        success: true,
        message: result.message,
        data: {
          email,
          verified: true,
          purpose: "registration",
        },
      });
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // ✅ MÉTODOS ADMIN QUE ESTAVAM FALTANDO:

  // 🎯 LISTAR TODOS OS CLIENTES (ADMIN)
  public listClients = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search } = req.query;

      // ✅ CORREÇÃO: Chamar o service corretamente
      const result = await this.clientService.listClients({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });

      // ✅ CORREÇÃO: Retornar a estrutura correta
      return res.status(200).json({ // ✅ Adicionar return
        success: true,
        data: result.clients,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 OBTER CLIENTE POR ID (ADMIN)
  public getClientById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const result = await this.clientService.getProfile(clientId);

      if (!result.success) {
        return res.status(result.statusCode).json(result); // ✅ Adicionar return
      }

      return res.status(200).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // 🎯 ATUALIZAR STATUS DO CLIENTE (ADMIN)
  public updateClientStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new AppError("Status é obrigatório", 400, "MISSING_STATUS");
      }

      const validStatuses = ["active", "inactive", "suspended", "pending"];
      if (!validStatuses.includes(status)) {
        throw new AppError("Status inválido", 400, "INVALID_STATUS");
      }

      const result = await this.clientService.updateClientStatus(
        clientId,
        status
      );

      if (!result.success) {
        return res.status(result.statusCode).json(result); // ✅ Adicionar return
      }

      return res.status(200).json(result); // ✅ Adicionar return
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  // ✅ CORREÇÃO: Métodos adicionais que estavam no exemplo

  public getClientByIdAlternative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new AppError("ID do cliente é obrigatório", 400, "MISSING_ID");
      }

      const client = await this.clientService.getClientById(id);
      
      if (!client) {
        throw new AppError("Cliente não encontrado", 404, "CLIENT_NOT_FOUND");
      }

      return res.status(200).json({ // ✅ Adicionar return
        success: true,
        data: client,
      });
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };

  public updateClientStatusAlternative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || !status) {
        throw new AppError("ID e status são obrigatórios", 400, "MISSING_DATA");
      }

      const client = await this.clientService.updateClientStatus(id, status);

      return res.status(200).json({ // ✅ Adicionar return
        success: true,
        message: "Status atualizado com sucesso",
        data: client,
      });
    } catch (error) {
      return next(error); // ✅ Adicionar return
    }
  };
}