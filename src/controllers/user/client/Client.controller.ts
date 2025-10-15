import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { ClientModel } from "../../../models/user/client/Client.model";
import { AppError } from "../../../utils/AppError";
import { ClientService } from "../../../services/user/client/Client.service";
import { OTPService } from "../../../services/otp/OTP.service";
import {
  UserMainRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";

export class ClientController {
  private clientService: ClientService;
  private otpService: OTPService;

  constructor() {
    this.clientService = new ClientService();
    this.otpService = new OTPService();
  }

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fullName, email, password, phone, acceptTerms, role, subRole } =
        req.body;

      // ✅ 1. Verificar se email foi verificado via OTP
      const isEmailVerified = await this.otpService.isEmailVerified(
        email,
        "registration"
      );

      if (!isEmailVerified) {
        throw new AppError(
          "Email não verificado. Complete a verificação OTP primeiro.",
          400,
          "EMAIL_NOT_VERIFIED"
        );
      }

      // ✅ 2. VALIDAÇÕES (mantenha as que já tem)
      if (role && role !== UserMainRole.CLIENT) {
        throw new AppError(
          `Esta rota é apenas para registro de CLIENTES. Role não permitida: ${role}`,
          403,
          "ROLE_NOT_ALLOWED"
        );
      }

      if (!email || !password) {
        throw new AppError(
          "Email e password são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      if (!fullName?.firstName || !fullName?.lastName) {
        throw new AppError(
          "Nome completo é obrigatório",
          400,
          "MISSING_FULLNAME"
        );
      }

      if (!phone) {
        throw new AppError("Telefone é obrigatório", 400, "MISSING_PHONE");
      }

      if (!acceptTerms) {
        throw new AppError(
          "É necessário aceitar os termos de uso",
          400,
          "TERMS_NOT_ACCEPTED"
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      if (password.length < 6) {
        throw new AppError(
          "Password deve ter pelo menos 6 caracteres",
          400,
          "WEAK_PASSWORD"
        );
      }

      const phoneRegex = /^[0-9+\-\s()]{8,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
        throw new AppError(
          "Formato de telefone inválido",
          400,
          "INVALID_PHONE"
        );
      }

      // ✅ 3. VERIFICAR SE USUÁRIO JÁ EXISTE
      const existingClient = await ClientModel.findOne({
        email: email.toLowerCase().trim(),
      });

      let result;

      // ✅ 4. CRIAR displayName
      const displayName = `${fullName.firstName.trim()} ${fullName.lastName.trim()}`;

      if (existingClient) {
        // ✅ 5. ATUALIZAR USUÁRIO EXISTENTE
        console.log(`📝 Atualizando usuário existente: ${existingClient._id}`);

        // Atualizar campos com displayName
        existingClient.fullName = {
          firstName: fullName.firstName.trim(),
          lastName: fullName.lastName.trim(),
          displayName: displayName, // ✅ ADICIONA displayName
        };
        existingClient.phoneNumber = phone.trim();
        existingClient.acceptTerms = acceptTerms;
        existingClient.password = await bcrypt.hash(password, 12);
        existingClient.isVerified = true; // ⭐ MUDA DE false PARA true
        existingClient.status = UserStatus.ACTIVE;
        existingClient.isActive = true;
        existingClient.updatedAt = new Date();

        await existingClient.save();

        // ✅ 6. PREPARAR RESPOSTA (CORREÇÃO do delete)
        const clientResponse = {
          ...existingClient.toObject(),
          password: undefined, // ✅ CORREÇÃO: em vez de delete, define como undefined
        };

        result = {
          success: true,
          data: clientResponse,
        };

      
      } else {
        // ✅ 7. SE NÃO EXISTIR, CRIAR NOVO CLIENTE VERIFICADO
      
        const clientData = {
          email: email.toLowerCase().trim(),
          password: password,
          fullName: {
            firstName: fullName.firstName.trim(),
            lastName: fullName.lastName.trim(),
            displayName: displayName, // ✅ ADICIONA displayName
          },
          phoneNumber: phone.trim(),
          acceptTerms: acceptTerms,
          role: UserMainRole.CLIENT,
          status: UserStatus.ACTIVE,
          isActive: true,
          isVerified: true,
        };

        result = await this.clientService.createClient(clientData);
      }

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao criar/atualizar cliente",
          result.statusCode || 500,
          result.code || "CLIENT_CREATION_ERROR"
        );
      }

      res.status(200).json({
        success: true,
        message: existingClient
          ? "Cliente verificado e ativado com sucesso!"
          : "Cliente registrado e verificado com sucesso!",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;

      if (!clientId) {
        throw new AppError("Usuário não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.clientService.getProfile(clientId);

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao buscar perfil",
          result.statusCode || 500,
          result.code || "GET_PROFILE_ERROR"
        );
      }

      res.json({
        success: true,
        message: "Perfil recuperado com sucesso",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;
      const updates = req.body;

      if (!clientId) {
        throw new AppError("Usuário não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.clientService.updateProfile(clientId, updates);

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao atualizar perfil",
          result.statusCode || 500,
          result.code || "UPDATE_PROFILE_ERROR"
        );
      }

      res.json({
        success: true,
        message: "Perfil atualizado com sucesso",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;
      const { preferences } = req.body;

      if (!clientId) {
        throw new AppError("Usuário não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.clientService.updatePreferences(
        clientId,
        preferences
      );

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao atualizar preferências",
          result.statusCode || 500,
          result.code || "UPDATE_PREFERENCES_ERROR"
        );
      }

      res.json({
        success: true,
        message: "Preferências atualizadas com sucesso",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateLoyaltyPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const { points } = req.body;

      const result = await this.clientService.updateLoyaltyPoints(
        clientId,
        points
      );

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao atualizar pontos",
          result.statusCode || 500,
          result.code || "UPDATE_LOYALTY_ERROR"
        );
      }

      res.json({
        success: true,
        message: "Pontos de fidelidade atualizados",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public recordAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const result = await this.clientService.recordAppointment(clientId);

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao registrar agendamento",
          result.statusCode || 500,
          result.code || "RECORD_APPOINTMENT_ERROR"
        );
      }

      res.json({
        success: true,
        message: "Agendamento registrado com sucesso",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public listClients = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const result = await this.clientService.listClients({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
      });

      res.json({
        success: true,
        message: "Clientes listados com sucesso",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getClientById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const result = await this.clientService.getClientById(clientId);

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao buscar cliente",
          result.statusCode || 500,
          result.code || "GET_CLIENT_ERROR"
        );
      }

      res.json({
        success: true,
        message: "Cliente encontrado",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateClientStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const { status } = req.body;

      const result = await this.clientService.updateClientStatus(
        clientId,
        status
      );

      if (!result.success) {
        throw new AppError(
          result.error || "Erro ao atualizar status",
          result.statusCode || 500,
          result.code || "UPDATE_STATUS_ERROR"
        );
      }

      res.json({
        success: true,
        message: result.message || "Status atualizado com sucesso",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  public checkEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const existingClient = await ClientModel.findOne({
        email: email.toLowerCase().trim(),
      });

      const EmployeeModel =
        require("../../../models/user/employee/Employee.model").EmployeeModel;
      const AdminModel =
        require("../../../models/user/admin/Admin.model").AdminModel;

      const [existingEmployee, existingAdmin] = await Promise.all([
        EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
        AdminModel.findOne({ email: email.toLowerCase().trim() }),
      ]);

      const exists = !!(existingClient || existingEmployee || existingAdmin);

      res.json({
        success: true,
        message: exists ? "Email já registrado" : "Email disponível",
        data: {
          email,
          exists,
          available: !exists,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
