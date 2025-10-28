// AUTH-USERS-SERVICE/src/controllers/user/employee/Employee.controller.ts
import { Request, Response, NextFunction } from "express";
import EmployeeService from "../../../services/user/employee/Employee.service";
import { UserBaseController } from "../base/UserBase.controller";
import {
  EmployeeSubRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";

export class EmployeeController extends UserBaseController {
  protected userService: EmployeeService;
  protected userType = "employee";
  protected flowType = "employee_registration";

  constructor() {
    super();
    this.userService = new EmployeeService();
    console.log("✅ EmployeeController inicializado");
  }

  // ✅ MÉTODOS ABSTRATOS OBRIGATÓRIOS - CORRIGIDOS
  protected async validateSpecificData(
    data: any
  ): Promise<{ error: string; code: string } | null> {
    try {
      console.log(`🔍 [EmployeeController] Validando dados específicos:`, data);

      // ✅ CORREÇÃO: Verificar subRole tanto no nível raiz quanto em employeeData
      const subRole = data.subRole || data.employeeData?.subRole;
      
      if (!subRole) {
        console.log(`❌ [EmployeeController] SubRole não encontrado em:`, {
          nivelRaiz: data.subRole,
          employeeData: data.employeeData?.subRole
        });
        return {
          error: "subRole é obrigatório para employees",
          code: "MISSING_SUBROLE",
        };
      }

      // ✅ CORREÇÃO: Validação mais flexível para subRole
      const validSubRoles = Object.values(EmployeeSubRole);
      const isValidSubRole = validSubRoles.includes(subRole as EmployeeSubRole);
      
      if (!isValidSubRole) {
        console.log(`❌ [EmployeeController] SubRole inválido:`, {
          subRoleRecebido: subRole,
          subRolesValidos: validSubRoles
        });
        return {
          error: `subRole inválido. Valores permitidos: ${validSubRoles.join(", ")}`,
          code: "INVALID_SUBROLE",
        };
      }

      console.log(`✅ [EmployeeController] Validação específica passou:`, { subRole });
      return null;
    } catch (error: any) {
      console.error(`❌ [EmployeeController] Erro na validação:`, error.message);
      return {
        error: "Erro na validação dos dados",
        code: "VALIDATION_ERROR",
      };
    }
  }

  protected getDefaultStatus(): UserStatus {
    return UserStatus.PENDING_VERIFICATION;
  }

  protected getAdditionalRegistrationData(data: any): any {
    // ✅ CORREÇÃO: Obter subRole de múltiplas fontes
    const subRole = data.subRole || data.employeeData?.subRole || EmployeeSubRole.STAFF;

    console.log(`📦 [EmployeeController] Preparando dados adicionais:`, {
      subRoleRecebido: data.subRole,
      subRoleEmployeeData: data.employeeData?.subRole,
      subRoleFinal: subRole
    });

    return {
      employeeData: {
        subRole: subRole,
        isAvailable: data.employeeData?.isAvailable || false,
        services: data.employeeData?.services || [],
        workSchedule: data.employeeData?.workSchedule || this.getDefaultWorkSchedule(),
        specialties: data.employeeData?.specialties || [],
        rating: data.employeeData?.rating || { average: 0, totalReviews: 0 },
        totalAppointments: data.employeeData?.totalAppointments || 0,
        professionalTitle: data.employeeData?.professionalTitle || this.getProfessionalTitle(subRole),
        experienceYears: data.employeeData?.experienceYears || 0,
        bio: data.employeeData?.bio || "",
        hireDate: new Date(),
      },
    };
  }

  protected getAdditionalStartRegistrationData(data: any): any {
    // ✅ CORREÇÃO: Obter subRole de múltiplas fontes
    const subRole = data.subRole || data.employeeData?.subRole || EmployeeSubRole.STAFF;

    return {
      subRole: subRole,
      employeeData: {
        subRole: subRole,
      },
    };
  }

  // ✅ MÉTODO AUXILIAR PARA TÍTULO PROFISSIONAL
  private getProfessionalTitle(subRole: string): string {
    const titles: { [key: string]: string } = {
      'salon_owner': 'Proprietário de Salão',
      'stylist': 'Estilista Profissional', 
      'barber': 'Barbeiro',
      'manicurist': 'Manicure',
      'esthetician': 'Esteticista',
      'receptionist': 'Recepcionista',
      'staff': 'Funcionário do Salão',
      'SALON_OWNER': 'Proprietário de Salão',
      'STYLIST': 'Estilista Profissional',
      'BARBER': 'Barbeiro',
      'MANICURIST': 'Manicure',
      'ESTHETICIAN': 'Esteticista',
      'RECEPTIONIST': 'Recepcionista',
      'STAFF': 'Funcionário do Salão'
    };

    return titles[subRole] || 'Profissional de Beleza';
  }

  // ✅ MÉTODO DE REGISTRO SOBRESCRITO CORRETAMENTE
  public startRegistration = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<Response> => {
    try {
      console.log(`🎯 [EmployeeController] Iniciando registro para:`, req.body.email);
      console.log(`📋 [EmployeeController] Dados completos recebidos:`, JSON.stringify(req.body, null, 2));

      // ✅ VALIDAÇÃO BÁSICA
      const { email, firstName, password, acceptTerms, subRole } = req.body;

      if (!email || !firstName || !password || !acceptTerms || !subRole) {
        console.log(`❌ [EmployeeController] Dados obrigatórios faltando:`, {
          email: !!email,
          firstName: !!firstName,
          password: !!password,
          acceptTerms: !!acceptTerms,
          subRole: !!subRole
        });
        
        return res.status(400).json({
          success: false,
          error: "Dados incompletos",
          message: "Email, nome, senha, termos e sub-role são obrigatórios",
          code: "MISSING_REQUIRED_FIELDS",
          details: {
            email: !!email,
            firstName: !!firstName,
            password: !!password,
            acceptTerms: !!acceptTerms,
            subRole: !!subRole
          }
        });
      }

      // ✅ CHAMAR MÉTODO DA BASE (correto)
      return await super.startRegistration(req, res, next);
      
    } catch (error: any) {
      console.error(`❌ [EmployeeController] Erro no startRegistration:`, error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        message: "Falha ao processar registro",
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  };

  // ✅ MÉTODO DE AUTORIZAÇÃO
  protected checkAuthorization(
    currentUser: any,
    targetUserId?: string
  ): boolean {
    if (!currentUser) return false;

    // Admin tem acesso total
    if (currentUser.role === "admin_system") return true;

    // Employee só pode acessar seus próprios recursos
    if (currentUser.role === "employee") {
      return currentUser.id === targetUserId;
    }

    return false;
  }

  protected unauthorizedResponse(): any {
    return {
      success: false,
      error: "Não autorizado para acessar este recurso",
      code: "UNAUTHORIZED_ACCESS",
    };
  }

  // 🎯 MÉTODOS ESPECÍFICOS DO EMPLOYEE (mantidos iguais)
  public toggleAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { isAvailable } = req.body;

      console.log(`🔄 [EmployeeController] Alterando disponibilidade:`, {
        employeeId,
        isAvailable,
      });

      if (typeof isAvailable !== "boolean") {
        res.status(400).json({
          success: false,
          error: "Disponibilidade deve ser booleana (true/false)",
          code: "INVALID_AVAILABILITY",
        });
        return;
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.toggleAvailability(
        employeeId,
        isAvailable
      );

      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no toggleAvailability:`,
        error.message
      );
      next(error);
    }
  };

  public updateWorkSchedule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { schedule } = req.body;

      console.log(`📅 [EmployeeController] Atualizando horário:`, {
        employeeId,
      });

      if (!schedule || typeof schedule !== "object") {
        res.status(400).json({
          success: false,
          error: "Agenda de trabalho inválida",
          code: "INVALID_SCHEDULE",
        });
        return;
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.updateWorkSchedule(
        employeeId,
        schedule
      );
      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no updateWorkSchedule:`,
        error.message
      );
      next(error);
    }
  };

  public updateServices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { services } = req.body;

      console.log(`🔧 [EmployeeController] Atualizando serviços:`, {
        employeeId,
        services,
      });

      if (!Array.isArray(services)) {
        res.status(400).json({
          success: false,
          error: "Serviços devem ser uma lista",
          code: "INVALID_SERVICES",
        });
        return;
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.updateServices(
        employeeId,
        services
      );
      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no updateServices:`,
        error.message
      );
      next(error);
    }
  };

  public addService = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { service } = req.body;

      console.log(`➕ [EmployeeController] Adicionando serviço:`, {
        employeeId,
        service,
      });

      if (!service || typeof service !== "string") {
        res.status(400).json({
          success: false,
          error: "Serviço deve ser uma string",
          code: "INVALID_SERVICE",
        });
        return;
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, employeeId)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.addService(employeeId, service);
      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no addService:`,
        error.message
      );
      next(error);
    }
  };

  public getAvailableEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { service, subRole } = req.query;

      console.log(`👥 [EmployeeController] Buscando employees disponíveis:`, {
        service,
        subRole,
      });

      const result = await this.userService.getAvailableEmployees(
        service as string,
        subRole as EmployeeSubRole
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no getAvailableEmployees:`,
        error.message
      );
      next(error);
    }
  };

  public getEmployeePublicProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;

      console.log(
        `👤 [EmployeeController] Buscando perfil público:`,
        employeeId
      );

      const result = await this.userService.getEmployeePublicProfile(
        employeeId
      );

      if (!result.success) {
        res.status(result.statusCode || 404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no getEmployeePublicProfile:`,
        error.message
      );
      next(error);
    }
  };

  // ✅ MÉTODOS DE ADMIN
  public listEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 10, search, subRole } = req.query;

      console.log(`📋 [EmployeeController] Listando employees:`, {
        page,
        limit,
        search,
        subRole,
      });

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.listEmployees({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        subRole: subRole as string,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no listEmployees:`,
        error.message
      );
      next(error);
    }
  };

  public updateEmployeeStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { status } = req.body;

      console.log(`🔄 [EmployeeController] Atualizando status:`, {
        employeeId,
        status,
      });

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.updateEmployeeStatus(
        employeeId,
        status
      );
      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no updateEmployeeStatus:`,
        error.message
      );
      next(error);
    }
  };

  public getEmployeeById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;

      console.log(
        `🔍 [EmployeeController] Buscando employee por ID:`,
        employeeId
      );

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.getProfile(employeeId);

      if (!result.success) {
        res.status(result.statusCode || 404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no getEmployeeById:`,
        error.message
      );
      next(error);
    }
  };

  public deleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const deletedBy = (req as any).user?.id;

      console.log(`🗑️ [EmployeeController] Excluindo employee:`, employeeId);

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await (this.userService as any).softDeleteUser(
        employeeId,
        deletedBy
      );

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no deleteEmployee:`,
        error.message
      );
      next(error);
    }
  };

  public restoreEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;

      console.log(`♻️ [EmployeeController] Restaurando employee:`, employeeId);

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await (this.userService as any).restoreUser(employeeId);

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no restoreEmployee:`,
        error.message
      );
      next(error);
    }
  };

  public hardDeleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;

      console.log(`💥 [EmployeeController] Exclusão permanente:`, employeeId);

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await (this.userService as any).hardDeleteUser(employeeId);

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no hardDeleteEmployee:`,
        error.message
      );
      next(error);
    }
  };

  // ✅ MÉTODOS DE STATUS E CLEANUP
  public getRegistrationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.params;

      console.log(
        `📊 [EmployeeController] Buscando status de registro:`,
        email
      );

      const result = await this.userService.getRegistrationStatus(email);

      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no getRegistrationStatus:`,
        error.message
      );
      next(error);
    }
  };

  public cleanupRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.body;

      console.log(`🧹 [EmployeeController] Limpando registro:`, email);

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        res.status(403).json(this.unauthorizedResponse());
        return;
      }

      const result = await this.userService.cleanupRegistration(email);

      res.status(result.statusCode || 200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no cleanupRegistration:`,
        error.message
      );
      next(error);
    }
  };

  // ✅ MÉTODOS DE PERFIL (herdados da base)
  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      console.log(`👤 [EmployeeController] Buscando perfil:`, userId);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Usuário não autenticado",
        });
        return;
      }

      const result = await this.userService.getProfile(userId);

      if (!result.success) {
        res.status(result.statusCode || 404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no getProfile:`,
        error.message
      );
      next(error);
    }
  };

  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const updateData = req.body;

      console.log(`✏️ [EmployeeController] Atualizando perfil:`, userId);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Usuário não autenticado",
        });
        return;
      }

      const result = await this.userService.updateProfile(userId, updateData);

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(
        `❌ [EmployeeController] Erro no updateProfile:`,
        error.message
      );
      next(error);
    }
  };

  // ✅ MÉTODO AUXILIAR PRIVADO
  private getDefaultWorkSchedule() {
    return {
      monday: { start: "09:00", end: "18:00", available: true },
      tuesday: { start: "09:00", end: "18:00", available: true },
      wednesday: { start: "09:00", end: "18:00", available: true },
      thursday: { start: "09:00", end: "18:00", available: true },
      friday: { start: "09:00", end: "18:00", available: true },
      saturday: { start: "09:00", end: "14:00", available: true },
      sunday: { start: "00:00", end: "00:00", available: false },
    };
  }
}

export default EmployeeController;