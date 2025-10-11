import { Request, Response, NextFunction } from "express";
import { EmployeeService } from "../../../services/user/employee/Employee.service";
import { OTPService } from "../../../services/otp/OTP.service";
import { AppError } from "../../../utils/AppError";
import { generateTokenPair } from "../../../utils/jwt.utils";
import { EmployeeSubRole } from "../../../models/interfaces/user.roles";

export class EmployeeController {
  private employeeService: EmployeeService;
  private otpService: OTPService;

  constructor() {
    this.employeeService = new EmployeeService();
    this.otpService = new OTPService();
  }

  // 🎯 REGISTRO DE EMPLOYEE COM VERIFICAÇÃO OTP
  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const employeeData = req.body;

      // Validações específicas do employee
      if (!employeeData.email || !employeeData.password) {
        throw new AppError(
          "Email e senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      if (!employeeData.fullName?.firstName) {
        throw new AppError("Nome é obrigatório", 400, "MISSING_NAME");
      }

      if (!employeeData.employeeData?.subRole) {
        throw new AppError(
          "Sub-role é obrigatório (salon_owner, staff, etc.)",
          400,
          "MISSING_SUBROLE"
        );
      }

      // Valida sub-role
      if (
        !Object.values(EmployeeSubRole).includes(
          employeeData.employeeData.subRole
        )
      ) {
        throw new AppError("Sub-role inválido", 400, "INVALID_SUBROLE");
      }

      // 🎯 VERIFICAR SE EMAIL ESTÁ VERIFICADO VIA OTP
      const otpStatus = this.otpService.getOTPStatus(employeeData.email);

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

      const result = await this.employeeService.createEmployee(employeeData);

      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      // 🎯 INVALIDAR OTP APÓS REGISTRO BEM-SUCEDIDO
      this.otpService.invalidateOTP(employeeData.email);

      // 🎯 GERAR TOKENS JWT
      const tokenPair = generateTokenPair({
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        subRole: result.data!.subRole,
        isVerified: result.data!.isVerified,
      });

      const responseWithToken = {
        ...result,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };

      return res.status(201).json(responseWithToken);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LOGIN DE EMPLOYEE
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

      const result = await this.employeeService.authenticate(email, password);

      if (!result.success) {
        const statusCode = result.code === "ACCOUNT_LOCKED" ? 423 : 401;
        return res.status(statusCode).json(result);
      }

      // 🎯 GERAR TOKENS JWT
      const tokenPair = generateTokenPair({
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        subRole: result.data!.subRole,
        isVerified: result.data!.isVerified,
      });

      const responseWithToken = {
        ...result,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };

      return res.status(200).json(responseWithToken);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 PERFIL DO EMPLOYEE
  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.employeeService.getProfile(employeeId);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR AGENDA
  public updateSchedule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const { schedule } = req.body;

      if (!schedule || typeof schedule !== "object") {
        throw new AppError("Agenda inválida", 400, "INVALID_SCHEDULE");
      }

      // 🎯 VERIFICAR SE USUÁRIO TEM ACESSO
      const currentUser = (req as any).user;
      if (
        currentUser.id !== employeeId &&
        currentUser.role !== "admin_system"
      ) {
        throw new AppError("Não autorizado", 403, "UNAUTHORIZED");
      }

      const result = await this.employeeService.updateSchedule(
        employeeId,
        schedule
      );
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR AVALIAÇÃO
  public updateRating = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const { rating } = req.body;

      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        throw new AppError(
          "Avaliação deve ser entre 1 e 5",
          400,
          "INVALID_RATING"
        );
      }

      // 🎯 APENAS CLIENTES E ADMINS PODEM AVALIAR
      const currentUser = (req as any).user;
      if (
        currentUser.role !== "client" &&
        currentUser.role !== "admin_system"
      ) {
        throw new AppError("Não autorizado para avaliar", 403, "UNAUTHORIZED");
      }

      const result = await this.employeeService.updateRating(
        employeeId,
        rating
      );
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ALTERAR DISPONIBILIDADE
  public toggleAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const { isAvailable } = req.body;

      if (typeof isAvailable !== "boolean") {
        throw new AppError(
          "Disponibilidade deve ser booleana",
          400,
          "INVALID_AVAILABILITY"
        );
      }

      // 🎯 VERIFICAR SE USUÁRIO TEM ACESSO
      const currentUser = (req as any).user;
      if (
        currentUser.id !== employeeId &&
        currentUser.role !== "admin_system"
      ) {
        throw new AppError("Não autorizado", 403, "UNAUTHORIZED");
      }

      const result = await this.employeeService.toggleAvailability(
        employeeId,
        isAvailable
      );
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LISTAR EMPLOYEES POR TIPO
  public listByRole = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { subRole } = req.query;

      // TODO: Implementar no service
      return res.status(200).json({
        success: true,
        data: [],
        message: `Employees com sub-role: ${subRole}`,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 SOLICITAR OTP PARA EMPLOYEE (conveniência)
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

      return res.status(200).json({
        success: true,
        message: "Código de verificação enviado para seu email",
        data: {
          email,
          purpose: "registration",
          expiresIn: "10 minutos",
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 VERIFICAR OTP PARA EMPLOYEE (conveniência)
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

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email,
          verified: true,
          purpose: "registration",
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR PERFIL (MÉTODO QUE ESTAVA FALTANDO)
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId = (req as any).user?.id;
      const updates = req.body;

      if (!employeeId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.employeeService.updateProfile(
        employeeId,
        updates
      );
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LISTAR TODOS OS EMPLOYEES (ADMIN)
  public getAllEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const result = await this.employeeService.getAllEmployees({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });

      return res.status(200).json({
        success: true,
        data: result.employees,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 OBTER EMPLOYEE POR ID (ADMIN)
  public getEmployeeById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;

      const result = await this.employeeService.getProfile(employeeId);

      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR EMPLOYEE (ADMIN)
  public updateEmployeeAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const updates = req.body;

      const result = await this.employeeService.updateEmployeeAdmin(
        employeeId,
        updates
      );

      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 DELETAR EMPLOYEE (ADMIN)
  public deleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;

      const result = await this.employeeService.deleteEmployee(employeeId);

      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LISTAR EMPLOYEES DISPONÍVEIS
  public getAvailableEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { service } = req.query;

      const result = await this.employeeService.getAvailableEmployees(
        service as string
      );

      return res.status(200).json({
        success: true,
        data: result.employees,
        total: result.total,
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 PERFIL PÚBLICO DO EMPLOYEE
  public getEmployeePublicProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;

      const result = await this.employeeService.getEmployeePublicProfile(
        employeeId
      );

      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };
}