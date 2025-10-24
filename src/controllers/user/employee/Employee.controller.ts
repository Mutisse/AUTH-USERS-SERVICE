// AUTH-USERS-SERVICE/src/controllers/user/employee/Employee.controller.ts
import { Request, Response, NextFunction } from "express";
import { EmployeeService } from "../../../services/user/employee/Employee.service";
import { UserBaseController } from "../base/UserBase.controller";
import {
  EmployeeSubRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import { AppError } from "../../../utils/AppError";

export class EmployeeController extends UserBaseController {
  protected userService = new EmployeeService();
  protected userType = "Employee";
  protected flowType = "employee_registration";

  constructor() {
    super();
  }

  // ✅ IMPLEMENTAÇÃO DOS MÉTODOS ABSTRATOS
  protected async validateSpecificData(
    data: any
  ): Promise<{ error: string; code: string } | null> {
    // ✅ VALIDAR SUBROLE PARA EMPLOYEE
    if (!data.employeeData?.subRole) {
      return {
        error: "subRole é obrigatório para employees",
        code: "MISSING_SUBROLE",
      };
    }

    if (!Object.values(EmployeeSubRole).includes(data.employeeData.subRole)) {
      return {
        error: "subRole inválido",
        code: "INVALID_SUBROLE",
      };
    }

    return null;
  }

  protected getDefaultStatus(): UserStatus {
    return UserStatus.VERIFIED;
  }

  protected getAdditionalStartRegistrationData(data: any): any {
    return {
      subRole: data.employeeData?.subRole,
    };
  }

  // 🎯 MÉTODOS ESPECÍFICOS DO EMPLOYEE

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

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.toggleAvailability(
        employeeId,
        isAvailable
      );
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR HORÁRIO DE TRABALHO
  public updateWorkSchedule = async (
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

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updateWorkSchedule(
        employeeId,
        schedule
      );
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR SERVIÇOS PRESTADOS
  public updateServices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const { services } = req.body;

      if (!Array.isArray(services)) {
        throw new AppError(
          "Serviços devem ser uma lista",
          400,
          "INVALID_SERVICES"
        );
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updateServices(
        employeeId,
        services
      );
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ADICIONAR SERVIÇO
  public addService = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const { service } = req.body;

      if (!service || typeof service !== "string") {
        throw new AppError("Serviço inválido", 400, "INVALID_SERVICE");
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.addService(employeeId, service);
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LISTAR EMPLOYEES DISPONÍVEIS (PÚBLICO)
  public getAvailableEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { service, subRole } = req.query;

      const result = await this.userService.getAvailableEmployees(
        service as string,
        subRole as EmployeeSubRole
      );

      return res.status(200).json(result);
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

      const result = await this.userService.getEmployeePublicProfile(
        employeeId
      );

      if (!result.success) {
        return res.status(result.statusCode || 404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 MÉTODOS DE ADMIN PARA GERENCIAR EMPLOYEES
  public listEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search, subRole } = req.query;

      // 🚧 NOTA: Precisamos implementar este método no EmployeeService
      // Por enquanto, vamos retornar um placeholder
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED",
        message: "listEmployees precisa ser implementado no EmployeeService",
      });
    } catch (error) {
      return next(error);
    }
  };

  public updateEmployeeStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== "string") {
        throw new AppError("Status é obrigatório", 400, "INVALID_STATUS");
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 NOTA: Precisamos implementar este método no EmployeeService
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED",
        message:
          "updateEmployeeStatus precisa ser implementado no EmployeeService",
      });
    } catch (error) {
      return next(error);
    }
  };

  public getEmployeeById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // Usar o getProfile que já existe no UserBaseService
      const result = await this.userService.getProfile(employeeId);

      if (!result.success) {
        return res.status(result.statusCode || 404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // No EmployeeController, substitua estes métodos:

  public deleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;
      const deletedBy = (req as any).user?.id;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // ✅ USAR O MÉTODO DA BASE
      const result = await (this.userService as any).softDeleteUser(
        employeeId,
        deletedBy
      );

      if (!result.success) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  public restoreEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // ✅ USAR O MÉTODO DA BASE
      const result = await (this.userService as any).restoreUser(employeeId);

      if (!result.success) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 EXCLUIR PERMANENTEMENTE (HARD DELETE - ADMIN)
  public hardDeleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { employeeId } = req.params;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // ✅ USAR O MÉTODO DA BASE
      const result = await (this.userService as any).hardDeleteUser(employeeId);

      if (!result.success) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };
}
