import bcrypt from "bcrypt";
import { UserBaseService } from "../base/UserBase.service";
import { EmployeeModel } from "../../../models/user/employee/Employee.model";
import {
  UserMainRole,
  EmployeeSubRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import generateCustomUserId from "../../../utils/generateCustomUserId";

// ✅ CORREÇÃO: Interface compatível com o Mongoose Document
interface EmployeeMongooseDocument {
  _id: any;
  password: string;
  isActive: boolean;
  profileImage?: string;
  createdAt?: Date;
  email: string;
  role: string;
  isVerified: boolean;
  status: string;
  fullName?: any;
  lastLogin?: Date;
  employeeData?: {
    subRole?: string;
    professionalTitle?: string;
    isAvailable?: boolean;
    rating?: any;
    specialization?: string;
    bio?: string;
    services?: string[];
    experienceYears?: number;
    workSchedule?: any;
  };
  // ✅ Adicionar propriedades do Mongoose Document
  save?: () => Promise<any>;
  $isNew?: boolean;
  $isDeleted?: boolean;
}

export class EmployeeService extends UserBaseService {
  protected userModel = EmployeeModel;

  // 🎯 MÉTODOS DE AUTENTICAÇÃO
  public async register(userData: any) {
    try {
      return await this.createEmployee(userData);
    } catch (error) {
      console.error("[EmployeeService] Erro no register:", error);
      return this.errorResponse(
        "Erro ao registrar employee",
        "REGISTER_ERROR",
        500,
        error
      );
    }
  }

  public async login(email: string, password: string) {
    try {
      const employee = await EmployeeModel.findOne({ email });
      if (!employee) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      // ✅ CORREÇÃO: Usar type assertion via unknown
      const employeeDoc = employee as unknown as EmployeeMongooseDocument;
      const isPasswordValid = await bcrypt.compare(password, employeeDoc.password);
      
      if (!isPasswordValid) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      if (!employeeDoc.isActive) {
        return this.errorResponse("Conta desativada", "ACCOUNT_DISABLED", 403);
      }

      return this.successResponse(
        this.mapToSessionUser(employee),
        200,
        "Login realizado com sucesso"
      );
    } catch (error) {
      return this.errorResponse("Erro no login", "LOGIN_ERROR", 500, error);
    }
  }

  public async authenticate(email: string, password: string) {
    try {
      const employee = await EmployeeModel.findOne({ email });
      if (!employee) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      // ✅ CORREÇÃO: Usar type assertion via unknown
      const employeeDoc = employee as unknown as EmployeeMongooseDocument;
      const isPasswordValid = await bcrypt.compare(password, employeeDoc.password);
      
      if (!isPasswordValid) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      if (!employeeDoc.isActive) {
        return this.errorResponse("Conta desativada", "ACCOUNT_DISABLED", 403);
      }

      return this.successResponse(
        this.mapToSessionUser(employee),
        200,
        "Autenticação realizada com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro na autenticação",
        "AUTHENTICATION_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 MÉTODOS ESPECÍFICOS DO EMPLOYEE
  public async createEmployee(employeeData: any) {
    try {
      if (!employeeData.employeeData?.subRole) {
        return this.errorResponse(
          "Sub-role é obrigatório para employee",
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
        status: UserStatus.ACTIVE,
        isActive: true,
        isVerified: false,
        employeeData: {
          hireDate: new Date(),
          experienceYears: 0,
          rating: { average: 0, totalReviews: 0 },
          isAvailable: true,
          workSchedule: this.getDefaultWorkSchedule(),
          ...employeeData.employeeData,
        },
      });

      console.log(
        `✅ Employee criado: ${newEmployee._id} - ${newEmployee.employeeData.subRole}`
      );
      return this.successResponse(
        this.mapToSessionUser(newEmployee),
        201,
        "Employee criado com sucesso"
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

  public async updateSchedule(employeeId: string, schedule: any) {
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
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar agenda",
        "UPDATE_SCHEDULE_ERROR",
        500,
        error
      );
    }
  }

  public async updateRating(employeeId: string, newRating: number) {
    try {
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) {
        return this.errorResponse(
          "Employee não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      const currentRating = employee.employeeData.rating;
      const totalReviews = currentRating.totalReviews + 1;
      const average =
        (currentRating.average * currentRating.totalReviews + newRating) /
        totalReviews;

      const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        {
          $set: {
            "employeeData.rating.average": Math.round(average * 10) / 10,
            "employeeData.rating.totalReviews": totalReviews,
          },
        },
        { new: true }
      );

      return this.successResponse({
        rating: updatedEmployee?.employeeData.rating,
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar avaliação",
        "UPDATE_RATING_ERROR",
        500,
        error
      );
    }
  }

  public async toggleAvailability(employeeId: string, isAvailable: boolean) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $set: { "employeeData.isAvailable": isAvailable } },
        { new: true }
      );

      return this.successResponse({
        isAvailable: employee?.employeeData.isAvailable,
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

  // 🎯 IMPLEMENTAÇÕES ABSTRATAS
  protected mapToSessionUser(employee: any) {
    // ✅ CORREÇÃO: Usar type assertion via unknown
    const emp = employee as unknown as EmployeeMongooseDocument;

    return {
      id: emp._id?.toString() || emp._id,
      email: emp.email,
      role: emp.role,
      subRole: emp.employeeData?.subRole,
      isVerified: emp.isVerified,
      isActive: emp.isActive,
      status: emp.status,
      fullName: emp.fullName,
      profileImage: emp.profileImage,
      lastLogin: emp.lastLogin,
      employeeData: {
        subRole: emp.employeeData?.subRole,
        professionalTitle: emp.employeeData?.professionalTitle,
        isAvailable: emp.employeeData?.isAvailable,
        rating: emp.employeeData?.rating,
      },
    };
  }

  protected enrichUserData(employee: any) {
    // ✅ CORREÇÃO: Usar type assertion via unknown
    const emp = employee as unknown as EmployeeMongooseDocument;

    return {
      ...this.mapToSessionUser(emp),
      phoneNumber: (employee as any).phoneNumber,
      birthDate: (employee as any).birthDate,
      gender: (employee as any).gender,
      preferences: (employee as any).preferences,
      employeeData: emp.employeeData,
      createdAt: emp.createdAt,
      updatedAt: (employee as any).updatedAt,
    };
  }

  // 🎯 MÉTODOS DE PERFIL
  public async getProfile(employeeId: string) {
    try {
      const employee = await EmployeeModel.findById(employeeId).select("-password");
      
      if (!employee) {
        return this.errorResponse(
          "Funcionário não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(employee));
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar perfil",
        "GET_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  public async updateProfile(employeeId: string, updates: any) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-password");

      if (!employee) {
        return this.errorResponse(
          "Funcionário não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(employee));
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar perfil",
        "UPDATE_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 MÉTODOS ADMIN
  public async getAllEmployees(options: {
    page: number;
    limit: number;
    search?: string;
  }) {
    try {
      const { page, limit, search } = options;
      const skip = (page - 1) * limit;

      let query = {};

      if (search) {
        query = {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { "fullName.firstName": { $regex: search, $options: "i" } },
            { "fullName.lastName": { $regex: search, $options: "i" } },
            {
              "employeeData.professionalTitle": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        };
      }

      const employees = await EmployeeModel.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await EmployeeModel.countDocuments(query);

      return {
        employees: employees.map((employee) => this.enrichUserData(employee)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("[EmployeeService] Erro ao listar funcionários:", error);
      throw error;
    }
  }

  public async updateEmployeeAdmin(employeeId: string, updates: any) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-password");

      if (!employee) {
        return this.errorResponse(
          "Funcionário não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(employee),
        200,
        "Funcionário atualizado com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar funcionário",
        "UPDATE_EMPLOYEE_ERROR",
        500,
        error
      );
    }
  }

  public async deleteEmployee(employeeId: string) {
    try {
      const employee = await EmployeeModel.findByIdAndUpdate(
        employeeId,
        {
          $set: {
            status: "inactive",
            isActive: false,
          },
        },
        { new: true }
      );

      if (!employee) {
        return this.errorResponse(
          "Funcionário não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        null,
        200,
        "Funcionário desativado com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro ao desativar funcionário",
        "DELETE_EMPLOYEE_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 MÉTODOS PÚBLICOS
  public async getAvailableEmployees(service?: string) {
    try {
      let query: any = {
        "employeeData.isAvailable": true,
        status: "active",
        isActive: true,
      };

      if (service) {
        query["employeeData.services"] = service;
      }

      const employees = await EmployeeModel.find(query)
        .select("-password -email -phoneNumber -preferences")
        .sort({ "employeeData.rating.average": -1 });

      return {
        employees: employees.map((employee) => {
          const emp = employee as unknown as EmployeeMongooseDocument;
          return {
            id: emp._id?.toString(),
            fullName: employee.fullName,
            professionalTitle: employee.employeeData.professionalTitle,
            specialization: employee.employeeData.specialization,
            rating: employee.employeeData.rating,
            profileImage: emp.profileImage,
            employeeData: {
              subRole: employee.employeeData.subRole,
              experienceYears: employee.employeeData.experienceYears,
              workSchedule: employee.employeeData.workSchedule,
            },
          };
        }),
        total: employees.length,
      };
    } catch (error) {
      console.error(
        "[EmployeeService] Erro ao listar funcionários disponíveis:",
        error
      );
      throw error;
    }
  }

  public async getEmployeePublicProfile(employeeId: string) {
    try {
      const employee = await EmployeeModel.findById(employeeId).select(
        "-password -email -phoneNumber -preferences"
      );

      if (!employee) {
        return this.errorResponse(
          "Funcionário não encontrado",
          "EMPLOYEE_NOT_FOUND",
          404
        );
      }

      const emp = employee as unknown as EmployeeMongooseDocument;
      
      const publicProfile = {
        id: emp._id?.toString(),
        fullName: employee.fullName,
        professionalTitle: employee.employeeData.professionalTitle,
        specialization: employee.employeeData.specialization,
        bio: employee.employeeData.bio,
        experienceYears: employee.employeeData.experienceYears,
        rating: employee.employeeData.rating,
        profileImage: emp.profileImage,
        employeeData: {
          subRole: employee.employeeData.subRole,
          workSchedule: employee.employeeData.workSchedule,
          services: employee.employeeData.services,
          isAvailable: employee.employeeData.isAvailable,
        },
        createdAt: emp.createdAt,
      };

      return this.successResponse(publicProfile);
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar perfil público",
        "GET_PUBLIC_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 MÉTODOS PRIVADOS
  private async isEmailAvailable(email: string): Promise<boolean> {
    const employee = await EmployeeModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return !employee;
  }

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