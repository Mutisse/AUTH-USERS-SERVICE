import bcrypt from "bcrypt";
import { UserBaseService } from "../base/UserBase.service";
import {
  EmployeeModel,
  EmployeeDocument,
} from "../../../models/user/employee/Employee.model";
import {
  UserMainRole,
  EmployeeSubRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import { generateUserId } from "../../../utils/generateCustomUserId";

export class EmployeeService extends UserBaseService {
  protected userModel = EmployeeModel;

  constructor() {
    super();
    console.log(`✅ EmployeeService inicializado`);
  }

  // ✅ IMPLEMENTAÇÕES DOS MÉTODOS ABSTRATOS OBRIGATÓRIOS
  protected mapToSessionUser(employee: EmployeeDocument) {
    if (!employee) {
      throw new Error("Employee document é null ou undefined");
    }

    return {
      id: employee._id?.toString() || "",
      email: employee.email || "",
      role: employee.role || UserMainRole.EMPLOYEE,
      subRole: employee.employeeData?.subRole || EmployeeSubRole.STAFF,
      isVerified: employee.isVerified || false,
      isActive: employee.isActive || false,
      status: employee.status || UserStatus.PENDING_VERIFICATION,
      fullName: employee.fullName || { firstName: "", lastName: "" },
      profileImage: employee.profileImage || "",
      lastLogin: employee.lastLogin || new Date(),
      employeeData: {
        subRole: employee.employeeData?.subRole || EmployeeSubRole.STAFF,
        professionalTitle: employee.employeeData?.professionalTitle || "",
        isAvailable: employee.employeeData?.isAvailable || false,
        rating: employee.employeeData?.rating || {
          average: 0,
          totalReviews: 0,
        },
      },
    };
  }

  protected enrichUserData(employee: EmployeeDocument) {
    const baseData = this.mapToSessionUser(employee);

    return {
      ...baseData,
      phoneNumber: employee.phoneNumber || "",
      birthDate: employee.birthDate,
      gender: employee.gender,
      address: employee.address || {},
      preferences: employee.preferences || {},
      employeeData: employee.employeeData || {},
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  // ✅ MÉTODO ABSTRATO createSpecificUser - CORRIGIDO
  protected async createSpecificUser(employeeData: any) {
    try {
      console.log(`🎯 [EmployeeService] Criando employee:`, employeeData.email);
      console.log(`📋 [EmployeeService] Dados recebidos:`, {
        email: employeeData.email,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        fullName: employeeData.fullName,
        phone: employeeData.phone,
        phoneNumber: employeeData.phoneNumber,
        hasPassword: !!employeeData.password,
        acceptTerms: employeeData.acceptTerms,
        subRole: employeeData.employeeData?.subRole,
      });

      // ✅ VALIDAÇÃO MELHORADA
      if (!employeeData.employeeData?.subRole) {
        console.log(
          `❌ [EmployeeService] Sub-role não fornecido:`,
          employeeData.employeeData
        );
        return this.errorResponse(
          "Sub-role é obrigatório para employees",
          "MISSING_SUBROLE",
          400
        );
      }

      // ✅ CORREÇÃO: Obter firstName e lastName de múltiplas fontes
      const firstName =
        employeeData.firstName || employeeData.fullName?.firstName;
      const lastName =
        employeeData.lastName || employeeData.fullName?.lastName || "";

      if (!firstName) {
        console.log(`❌ [EmployeeService] First name não fornecido`);
        return this.errorResponse(
          "Nome é obrigatório",
          "MISSING_FIRST_NAME",
          400
        );
      }

      if (!employeeData.password) {
        console.log(`❌ [EmployeeService] Password não fornecido`);
        return this.errorResponse(
          "Senha é obrigatória",
          "MISSING_PASSWORD",
          400
        );
      }

      if (!employeeData.acceptTerms) {
        console.log(`❌ [EmployeeService] Termos não aceitos`);
        return this.errorResponse(
          "Termos devem ser aceitos",
          "TERMS_NOT_ACCEPTED",
          400
        );
      }

      // ✅ Verificar disponibilidade do email
      console.log(
        `🔍 [EmployeeService] Verificando disponibilidade do email...`
      );
      const emailAvailable = await this.isEmailAvailable(employeeData.email);
      if (!emailAvailable) {
        console.log(
          `❌ [EmployeeService] Email já está em uso: ${employeeData.email}`
        );
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }
      console.log(
        `✅ [EmployeeService] Email disponível: ${employeeData.email}`
      );

      // ✅ Gerar ID padronizado
      const employeeId = generateUserId();
      console.log(`🆔 [EmployeeService] ID gerado: ${employeeId}`);

      const hashedPassword = await bcrypt.hash(employeeData.password, 12);
      console.log(`🔐 [EmployeeService] Password hash gerado`);

      // ✅ CORREÇÃO: Obter phoneNumber de múltiplas fontes
      const phoneNumber = employeeData.phoneNumber || employeeData.phone || "";

      // ✅ CORREÇÃO: Garantir que todos os campos obrigatórios estão preenchidos
      const fullName = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      };

      // ✅ Preparar dados do employee com estrutura correta
      const employeePayload = {
        _id: employeeId,
        email: employeeData.email.toLowerCase().trim(),
        fullName: fullName,
        phoneNumber: phoneNumber.trim(),
        password: hashedPassword,
        acceptTerms: employeeData.acceptTerms,
        role: UserMainRole.EMPLOYEE,
        status: UserStatus.ACTIVE, // ✅ Vai direto para ACTIVE como o cliente
        isActive: true, // ✅ Fica ativo
        isVerified: true, // ✅ Marcado como verificado
        employeeData: {
          subRole: employeeData.employeeData.subRole,
          professionalTitle:
            employeeData.employeeData.professionalTitle ||
            this.getProfessionalTitle(employeeData.employeeData.subRole),
          experienceYears: employeeData.employeeData.experienceYears || 0,
          bio: employeeData.employeeData.bio || "",
          services: employeeData.employeeData.services || [],
          specialties: employeeData.employeeData.specialties || [],
          rating: {
            average: 0,
            totalReviews: 0,
          },
          isAvailable: false,
          workSchedule: this.getDefaultWorkSchedule(),
          totalAppointments: 0,
          hireDate: new Date(),
        },
        preferences: {
          theme: "light",
          notifications: {
            email: true,
            push: true,
            sms: false,
            whatsapp: false,
          },
          language: "pt-MZ",
          timezone: "UTC",
        },
      };

      console.log(`📦 [EmployeeService] Payload final:`, {
        _id: employeePayload._id,
        email: employeePayload.email,
        fullName: employeePayload.fullName,
        phoneNumber: employeePayload.phoneNumber,
        hasPassword: !!employeePayload.password,
        role: employeePayload.role,
        employeeData: {
          subRole: employeePayload.employeeData.subRole,
          professionalTitle: employeePayload.employeeData.professionalTitle,
        },
      });

      const newEmployee = await EmployeeModel.create(employeePayload);

      console.log(`✅ Employee criado com sucesso: ${newEmployee._id}`);

      return this.successResponse(
        {
          user: this.enrichUserData(newEmployee),
          message:
            "Employee registrado com sucesso! Verifique seu email para ativar a conta.",
        },
        201,
        "Employee registrado com sucesso! Verifique seu email para ativar a conta."
      );
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao criar employee:", error);
      console.error("[EmployeeService] Stack trace:", error.stack);

      // ✅ CORREÇÃO: Mensagem de erro mais específica
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        return this.errorResponse(
          `Erro de validação: ${validationErrors.join(", ")}`,
          "VALIDATION_ERROR",
          400,
          validationErrors
        );
      }

      return this.errorResponse(
        "Erro interno ao criar employee",
        "CREATE_EMPLOYEE_ERROR",
        500,
        error.message
      );
    }
  }

  // ✅ MÉTODO AUXILIAR PARA TÍTULO PROFISSIONAL
  private getProfessionalTitle(subRole: string): string {
    const titles: { [key: string]: string } = {
      salon_owner: "Proprietário de Salão",
      stylist: "Estilista Profissional",
      barber: "Barbeiro",
      manicurist: "Manicure",
      esthetician: "Esteticista",
      receptionist: "Recepcionista",
      staff: "Funcionário do Salão",
      SALON_OWNER: "Proprietário de Salão",
      STYLIST: "Estilista Profissional",
      BARBER: "Barbeiro",
      MANICURIST: "Manicure",
      ESTHETICIAN: "Esteticista",
      RECEPTIONIST: "Recepcionista",
      STAFF: "Funcionário do Salão",
    };

    return titles[subRole] || "Profissional de Beleza";
  }

  // ✅ MÉTODO PARA VERIFICAR DISPONIBILIDADE DO EMAIL
  protected async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const existingEmployee = await EmployeeModel.findOne({
        email: email.toLowerCase().trim(),
      });
      return !existingEmployee;
    } catch (error) {
      console.error("[EmployeeService] Erro ao verificar email:", error);
      return false;
    }
  }

  // ✅ MÉTODO PÚBLICO PARA CRIAR EMPLOYEE (compatibilidade)
  public async createEmployee(employeeData: any) {
    return this.createSpecificUser(employeeData);
  }

  // ✅ ATIVAÇÃO DE CONTA
  public async activateAccount(employeeId: string) {
    try {
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      employee.isVerified = true;
      employee.emailVerifiedAt = new Date();
      employee.status = UserStatus.VERIFIED;
      employee.isActive = true;
      employee.employeeData.isAvailable = true;
      await employee.save();

      return this.successResponse(
        this.enrichUserData(employee),
        200,
        "Conta ativada com sucesso"
      );
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao ativar conta:", error);
      return this.errorResponse(
        "Erro ao ativar conta",
        "ACTIVATION_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO UPDATE PROFILE
  public async updateProfile(userId: string, updateData: any) {
    try {
      console.log(
        `✏️ [EmployeeService] Atualizando perfil: ${userId}`,
        updateData
      );

      // ✅ Remover campos que não podem ser atualizados
      const { password, email, role, _id, ...safeUpdateData } = updateData;

      const employee = await EmployeeModel.findByIdAndUpdate(
        userId,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(employee),
        200,
        "Perfil atualizado com sucesso"
      );
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao atualizar perfil:", error);
      return this.errorResponse(
        "Erro ao atualizar perfil",
        "UPDATE_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO PARA ATUALIZAR PREFERÊNCIAS
  public async updatePreferences(userId: string, preferences: any) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true }
      ).select("-password");

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        preferences: employee.preferences,
        message: "Preferências atualizadas com sucesso",
      });
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao atualizar preferências:", error);
      return this.errorResponse(
        "Erro ao atualizar preferências",
        "UPDATE_PREFERENCES_ERROR",
        500,
        error
      );
    }
  }

  // ✅ DISPONIBILIDADE
  public async toggleAvailability(employeeId: string, isAvailable: boolean) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $set: { "employeeData.isAvailable": isAvailable } },
        { new: true }
      );

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        isAvailable: employee.employeeData.isAvailable,
        message: isAvailable
          ? "Agora está disponível para agendamentos"
          : "Indisponível para agendamentos",
      });
    } catch (error: any) {
      console.error(
        "[EmployeeService] Erro ao atualizar disponibilidade:",
        error
      );
      return this.errorResponse(
        "Erro ao atualizar disponibilidade",
        "UPDATE_AVAILABILITY_ERROR",
        500,
        error
      );
    }
  }

  // ✅ HORÁRIO DE TRABALHO
  public async updateWorkSchedule(employeeId: string, schedule: any) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $set: { "employeeData.workSchedule": schedule } },
        { new: true }
      );

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        workSchedule: employee.employeeData.workSchedule,
        message: "Horário de trabalho atualizado",
      });
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao atualizar horário:", error);
      return this.errorResponse(
        "Erro ao atualizar horário",
        "UPDATE_SCHEDULE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ SERVIÇOS PRESTADOS
  public async updateServices(employeeId: string, services: string[]) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $set: { "employeeData.services": services } },
        { new: true }
      );

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        services: employee.employeeData.services,
        message: "Serviços atualizados",
      });
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao atualizar serviços:", error);
      return this.errorResponse(
        "Erro ao atualizar serviços",
        "UPDATE_SERVICES_ERROR",
        500,
        error
      );
    }
  }

  public async addService(employeeId: string, service: string) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $addToSet: { "employeeData.services": service } },
        { new: true }
      );

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        services: employee.employeeData.services,
        message: "Serviço adicionado",
      });
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao adicionar serviço:", error);
      return this.errorResponse(
        "Erro ao adicionar serviço",
        "ADD_SERVICE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ LISTAGEM PÚBLICA
  public async getAvailableEmployees(
    service?: string,
    subRole?: EmployeeSubRole
  ) {
    try {
      let query: any = {
        "employeeData.isAvailable": true,
        status: UserStatus.ACTIVE,
        isActive: true,
      };

      if (service) {
        query["employeeData.services"] = service;
      }

      if (subRole) {
        query["employeeData.subRole"] = subRole;
      }

      const employees = await EmployeeModel.find(query)
        .select("fullName profileImage employeeData")
        .sort({ "employeeData.rating.average": -1 });

      return this.successResponse({
        employees: employees.map((employee: EmployeeDocument) => ({
          id: employee._id.toString(),
          fullName: employee.fullName,
          professionalTitle: employee.employeeData.professionalTitle,
          specialization: employee.employeeData.specialization,
          rating: employee.employeeData.rating,
          profileImage: employee.profileImage,
          employeeData: {
            subRole: employee.employeeData.subRole,
            experienceYears: employee.employeeData.experienceYears,
            services: employee.employeeData.services,
          },
        })),
        total: employees.length,
      });
    } catch (error: any) {
      console.error(
        "[EmployeeService] Erro ao listar employees disponíveis:",
        error
      );
      return this.errorResponse(
        "Erro ao listar employees",
        "LIST_EMPLOYEES_ERROR",
        500,
        error
      );
    }
  }

  // ✅ PERFIL PÚBLICO
  public async getEmployeePublicProfile(employeeId: string) {
    try {
      const employee = await EmployeeModel.findById(employeeId).select(
        "fullName profileImage employeeData createdAt"
      );

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      const publicProfile = {
        id: employee._id.toString(),
        fullName: employee.fullName,
        professionalTitle: employee.employeeData.professionalTitle,
        specialization: employee.employeeData.specialization,
        bio: employee.employeeData.bio,
        experienceYears: employee.employeeData.experienceYears,
        rating: employee.employeeData.rating,
        profileImage: employee.profileImage,
        employeeData: {
          subRole: employee.employeeData.subRole,
          services: employee.employeeData.services,
        },
        memberSince: employee.createdAt,
      };

      return this.successResponse(publicProfile);
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao buscar perfil:", error);
      return this.errorResponse(
        "Erro ao buscar perfil",
        "GET_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ LISTAR EMPLOYEES (ADMIN)
  public async listEmployees(options: {
    page: number;
    limit: number;
    search?: string;
    subRole?: string;
  }) {
    try {
      const { page, limit, search, subRole } = options;
      const skip = (page - 1) * limit;

      let query: any = { role: UserMainRole.EMPLOYEE };

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { "fullName.firstName": { $regex: search, $options: "i" } },
          { "fullName.lastName": { $regex: search, $options: "i" } },
        ];
      }

      if (subRole) {
        query["employeeData.subRole"] = subRole;
      }

      const employees = await EmployeeModel.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await EmployeeModel.countDocuments(query);

      return this.successResponse({
        employees: employees.map((employee: EmployeeDocument) =>
          this.enrichUserData(employee)
        ),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao listar employees:", error);
      return this.errorResponse(
        "Erro ao listar employees",
        "LIST_EMPLOYEES_ERROR",
        500,
        error
      );
    }
  }

  // ✅ ATUALIZAR STATUS DO EMPLOYEE (ADMIN)
  public async updateEmployeeStatus(employeeId: string, status: string) {
    try {
      const validStatuses = Object.values(UserStatus);
      if (!validStatuses.includes(status as UserStatus)) {
        return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
      }

      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        {
          $set: {
            status,
            isActive: status === UserStatus.ACTIVE,
            ...(status !== UserStatus.ACTIVE && { deactivatedAt: new Date() }),
          },
        },
        { new: true, runValidators: true }
      ).select("-password");

      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(employee),
        200,
        `Status do employee atualizado para ${status}`
      );
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao atualizar status:", error);
      return this.errorResponse(
        "Erro ao atualizar status",
        "UPDATE_STATUS_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODOS DE STATUS E CLEANUP
  public async getRegistrationStatus(email: string) {
    try {
      const employee = await EmployeeModel.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!employee) {
        return this.successResponse({
          email,
          exists: false,
          status: "NOT_REGISTERED",
          canRegister: true,
        });
      }

      return this.successResponse({
        email,
        exists: true,
        status: employee.status,
        isVerified: employee.isVerified,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        canRegister: employee.status === UserStatus.INACTIVE,
      });
    } catch (error: any) {
      console.error("[EmployeeService] Erro ao buscar status:", error);
      return this.errorResponse(
        "Erro ao buscar status de registro",
        "STATUS_CHECK_ERROR",
        500,
        error
      );
    }
  }

  public async cleanupRegistration(email: string) {
    try {
      const result = await EmployeeModel.deleteOne({
        email: email.toLowerCase().trim(),
      });

      if (result.deletedCount === 0) {
        return this.errorResponse(
          "Registro não encontrado",
          "REGISTRATION_NOT_FOUND",
          404
        );
      }

      return this.successResponse(null, 200, "Registro limpo com sucesso");
    } catch (error: any) {
      console.error("[EmployeeService] Erro na limpeza:", error);
      return this.errorResponse(
        "Erro ao limpar registro",
        "CLEANUP_ERROR",
        500,
        error
      );
    }
  }

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

export default EmployeeService;
