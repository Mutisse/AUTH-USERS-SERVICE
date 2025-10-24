// AUTH-USERS-SERVICE/src/services/user/employee/Employee.service.ts
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
import generateCustomUserId from "../../../utils/generateCustomUserId";

export class EmployeeService extends UserBaseService {
  protected userModel = EmployeeModel;

  // ✅ IMPLEMENTAÇÕES DOS MÉTODOS ABSTRATOS OBRIGATÓRIOS
  protected mapToSessionUser(employee: EmployeeDocument) {
    return {
      id: employee._id.toString(),
      email: employee.email,
      role: employee.role,
      subRole: employee.employeeData.subRole,
      isVerified: employee.isVerified,
      isActive: employee.isActive,
      status: employee.status,
      fullName: employee.fullName,
      profileImage: employee.profileImage,
      lastLogin: employee.lastLogin,
      employeeData: {
        subRole: employee.employeeData.subRole,
        professionalTitle: employee.employeeData.professionalTitle,
        isAvailable: employee.employeeData.isAvailable,
        rating: employee.employeeData.rating,
      },
    };
  }

  protected enrichUserData(employee: EmployeeDocument) {
    return {
      ...this.mapToSessionUser(employee),
      phoneNumber: employee.phoneNumber,
      birthDate: employee.birthDate,
      gender: employee.gender,
      address: employee.address,
      preferences: employee.preferences,
      employeeData: employee.employeeData,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  // ✅ IMPLEMENTAÇÃO DO MÉTODO ABSTRATO createSpecificUser
  protected async createSpecificUser(employeeData: any) {
    try {
      if (!employeeData.employeeData?.subRole) {
        return this.errorResponse(
          "Sub-role é obrigatório",
          "MISSING_SUBROLE",
          400
        );
      }

      if (!(await this.isEmailAvailable(employeeData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      const employeeId = generateCustomUserId(UserMainRole.EMPLOYEE);
      const hashedPassword = await bcrypt.hash(employeeData.password, 12);

      const newEmployee = await EmployeeModel.create({
        _id: employeeId,
        ...employeeData,
        password: hashedPassword,
        role: UserMainRole.EMPLOYEE,
        status: UserStatus.PENDING_VERIFICATION,
        isActive: false,
        isVerified: false,
        employeeData: {
          hireDate: new Date(),
          experienceYears: 0,
          rating: { average: 0, totalReviews: 0 },
          isAvailable: false,
          workSchedule: this.getDefaultWorkSchedule(),
          services: employeeData.employeeData.services || [],
          ...employeeData.employeeData,
        },
      });

      console.log(`✅ Employee criado: ${newEmployee._id}`);

      return this.successResponse(
        this.enrichUserData(newEmployee),
        202,
        "Registro criado com sucesso! Verifique seu email."
      );
    } catch (error) {
      console.error("[EmployeeService] Erro ao criar employee:", error);
      return this.errorResponse(
        "Erro ao criar employee",
        "CREATE_EMPLOYEE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO PÚBLICO PARA CRIAR EMPLOYEE (mantido para compatibilidade)
  public async createEmployee(employeeData: any) {
    return this.createSpecificUser(employeeData);
  }

  // 2. ATIVAÇÃO DE CONTA (específico - não existe no UserBase)
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
    } catch (error) {
      return this.errorResponse(
        "Erro ao ativar conta",
        "ACTIVATION_ERROR",
        500,
        error
      );
    }
  }

  // 3. DISPONIBILIDADE (específico do employee)
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
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar disponibilidade",
        "UPDATE_AVAILABILITY_ERROR",
        500,
        error
      );
    }
  }

  // 4. HORÁRIO DE TRABALHO (específico do employee)
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
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar horário",
        "UPDATE_SCHEDULE_ERROR",
        500,
        error
      );
    }
  }

  // 5. SERVIÇOS PRESTADOS (específico do employee)
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
    } catch (error) {
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
    } catch (error) {
      return this.errorResponse(
        "Erro ao adicionar serviço",
        "ADD_SERVICE_ERROR",
        500,
        error
      );
    }
  }

  // 6. LISTAGEM PÚBLICA (específico do employee)
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
    } catch (error) {
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

  // 7. PERFIL PÚBLICO (específico do employee)
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
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar perfil",
        "GET_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO PARA LISTAR EMPLOYEES (ADMIN)
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
        employees: employees.map((employee) => this.enrichUserData(employee)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[EmployeeService] Erro ao listar employees:", error);
      return this.errorResponse(
        "Erro ao listar employees",
        "LIST_EMPLOYEES_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO PARA ATUALIZAR STATUS DO EMPLOYEE (ADMIN)
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
    } catch (error) {
      console.error("[EmployeeService] Erro ao atualizar status:", error);
      return this.errorResponse(
        "Erro ao atualizar status",
        "UPDATE_STATUS_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO AUXILIAR PARA VERIFICAR EMAIL (PROTECTED - compatível com UserBaseService)
  protected async isEmailAvailable(email: string): Promise<boolean> {
    const employee = await EmployeeModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return !employee;
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
