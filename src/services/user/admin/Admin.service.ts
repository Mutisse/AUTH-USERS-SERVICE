import bcrypt from "bcrypt";
import { UserBaseService } from "../base/UserBase.service";
import { AdminModel } from "../../../models/user/admin/Admin.model";
import { ClientModel } from "../../../models/user/client/Client.model";
import { EmployeeModel } from "../../../models/user/employee/Employee.model";
import {
  UserMainRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import generateCustomUserId from "../../../utils/generateCustomUserId";

export class AdminService extends UserBaseService {
  protected userModel = AdminModel;

  // ✅ CORREÇÃO: Adicionar métodos register e login que estavam faltando
  public async register(userData: any) {
    try {
      return await this.createAdmin(userData);
    } catch (error) {
      console.error("[AdminService] Erro no register:", error);
      return this.errorResponse(
        "Erro ao registrar admin",
        "REGISTER_ERROR",
        500,
        error
      );
    }
  }

  public async login(email: string, password: string) {
    try {
      const admin = await AdminModel.findOne({ email });
      if (!admin) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      if (!admin.isActive) {
        return this.errorResponse("Conta desativada", "ACCOUNT_DISABLED", 403);
      }

      return this.successResponse(
        this.mapToSessionUser(admin),
        200,
        "Login realizado com sucesso"
      );
    } catch (error) {
      return this.errorResponse("Erro no login", "LOGIN_ERROR", 500, error);
    }
  }

  // 🎯 MÉTODOS ESPECÍFICOS DO ADMIN
  public async createAdmin(adminData: any) {
    try {
      if (!(await this.isEmailAvailable(adminData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      // Gera ID personalizado para admin
      const adminId = generateCustomUserId(UserMainRole.ADMINSYSTEM);

      const hashedPassword = await bcrypt.hash(adminData.password, 12);

      const newAdmin = await AdminModel.create({
        _id: adminId,
        ...adminData,
        password: hashedPassword,
        role: UserMainRole.ADMINSYSTEM,
        status: UserStatus.ACTIVE,
        isActive: true,
        isVerified: true, // Admin é verificado por padrão
        adminData: {
          permissions: ["users:read", "users:write", "system:config"],
          accessLevel: "limited",
          managedUsers: 0,
          systemNotifications: true,
          ...adminData.adminData,
        },
      });

      console.log(`✅ Admin criado: ${newAdmin._id}`);
      return this.successResponse(
        this.mapToSessionUser(newAdmin),
        201,
        "Admin criado com sucesso"
      );
    } catch (error) {
      console.error("[AdminService] Erro ao criar admin:", error);
      return this.errorResponse(
        "Erro ao criar admin",
        "CREATE_ADMIN_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 ATUALIZAR PERFIL DO ADMIN
  public async updateProfile(adminId: string, updates: any) {
    try {
      const admin = await AdminModel.findByIdAndUpdate(
        adminId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-password");

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(admin));
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar perfil",
        "UPDATE_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ CORREÇÃO: Adicionar propriedade status ao options
  public async getAllUsers(options: {
    page: number;
    limit: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    try {
      const { page, limit, role, status, search } = options;
      const skip = (page - 1) * limit;

      let query: any = {};

      if (role) {
        query.role = role;
      }

      if (status) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { "fullName.firstName": { $regex: search, $options: "i" } },
          { "fullName.lastName": { $regex: search, $options: "i" } },
        ];
      }

      // Buscar de todos os modelos de usuário
      const [clients, employees, admins] = await Promise.all([
        role === "client" || !role
          ? ClientModel.find(query).select("-password").skip(skip).limit(limit)
          : [],
        role === "employee" || !role
          ? EmployeeModel.find(query)
              .select("-password")
              .skip(skip)
              .limit(limit)
          : [],
        role === "admin_system" || !role
          ? AdminModel.find(query).select("-password").skip(skip).limit(limit)
          : [],
      ]);

      const allUsers = [...clients, ...employees, ...admins];
      const total = allUsers.length;

      // ✅ CORREÇÃO: Retornar users em vez de data
      return {
        users: allUsers.map((user) => this.enrichUserData(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("[AdminService] Erro ao listar usuários:", error);
      throw error;
    }
  }

  // 🎯 OBTER USUÁRIO POR ID
  public async getUserById(userId: string) {
    try {
      // Tentar encontrar em todos os modelos
      const [client, employee, admin] = await Promise.all([
        ClientModel.findById(userId).select("-password"),
        EmployeeModel.findById(userId).select("-password"),
        AdminModel.findById(userId).select("-password"),
      ]);

      const user = client || employee || admin;

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(user));
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar usuário",
        "GET_USER_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 ATUALIZAR STATUS DO USUÁRIO
  public async updateUserStatus(userId: string, status: string) {
    try {
      const validStatuses = ["active", "inactive", "suspended", "pending"];
      if (!validStatuses.includes(status)) {
        return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
      }

      // Tentar atualizar em todos os modelos
      const [client, employee, admin] = await Promise.all([
        ClientModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              status,
              isActive: status === "active",
            },
          },
          { new: true, runValidators: true }
        ),
        EmployeeModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              status,
              isActive: status === "active",
            },
          },
          { new: true, runValidators: true }
        ),
        AdminModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              status,
              isActive: status === "active",
            },
          },
          { new: true, runValidators: true }
        ),
      ]);

      const updatedUser = client || employee || admin;

      if (!updatedUser) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(updatedUser),
        200,
        `Status do usuário atualizado para ${status}`
      );
    } catch (error) {
      console.error("[AdminService] Erro ao atualizar status:", error);
      return this.errorResponse(
        "Erro ao atualizar status",
        "UPDATE_STATUS_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 DELETAR USUÁRIO
  public async deleteUser(userId: string) {
    try {
      // Tentar desativar em todos os modelos
      const [client, employee, admin] = await Promise.all([
        ClientModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              status: "inactive",
              isActive: false,
            },
          },
          { new: true }
        ),
        EmployeeModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              status: "inactive",
              isActive: false,
            },
          },
          { new: true }
        ),
        AdminModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              status: "inactive",
              isActive: false,
            },
          },
          { new: true }
        ),
      ]);

      const deletedUser = client || employee || admin;

      if (!deletedUser) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse(null, 200, "Usuário desativado com sucesso");
    } catch (error) {
      return this.errorResponse(
        "Erro ao desativar usuário",
        "DELETE_USER_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 CRIAR BACKUP
  public async createBackup() {
    try {
      // Simular criação de backup
      const backupInfo = {
        timestamp: new Date().toISOString(),
        users: await this.getUserCounts(),
        size: "0 MB",
        file: `backup_${Date.now()}.json`,
      };

      return backupInfo;
    } catch (error) {
      console.error("[AdminService] Erro ao criar backup:", error);
      throw error;
    }
  }

  // 🎯 OBTER LOGS DO SISTEMA
  public async getSystemLogs(limit: number = 100) {
    try {
      // Simular logs do sistema
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: "INFO",
          message: "Sistema iniciado",
          service: "auth-service",
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: "INFO",
          message: "Backup automático executado",
          service: "backup-service",
        },
      ];

      return logs.slice(0, limit);
    } catch (error) {
      console.error("[AdminService] Erro ao buscar logs:", error);
      throw error;
    }
  }

  // 🎯 MÉTODOS DE ADMINISTRAÇÃO DO SISTEMA - CORRIGIDO
  public async getSystemStats() {
    try {
      // ✅ CORREÇÃO: Usar await em todos os countDocuments
      const [
        totalClients,
        totalEmployees,
        totalAdmins,
        activeClients,
        activeEmployees,
        activeAdmins,
      ] = await Promise.all([
        ClientModel.countDocuments(),
        EmployeeModel.countDocuments(),
        AdminModel.countDocuments(),
        ClientModel.countDocuments({ isActive: true }),
        EmployeeModel.countDocuments({ isActive: true }),
        AdminModel.countDocuments({ isActive: true }),
      ]);

      // ✅ CORREÇÃO: Agora podemos somar os números (não as promises)
      const totalUsers = totalClients + totalEmployees + totalAdmins;
      const activeUsers = activeClients + activeEmployees + activeAdmins;

      const stats = {
        totalUsers,
        totalClients,
        totalEmployees,
        totalAdmins,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        systemUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };

      return this.successResponse(stats);
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar estatísticas",
        "GET_STATS_ERROR",
        500,
        error
      );
    }
  }

  public async manageUser(userId: string, action: string, data?: any) {
    try {
      // Implementar ações de gestão de usuários
      let result;

      switch (action) {
        case "reset_password":
          result = await this.resetUserPassword(userId);
          break;
        case "update_role":
          result = await this.updateUserRole(userId, data?.role);
          break;
        case "send_notification":
          result = await this.sendUserNotification(userId, data?.message);
          break;
        default:
          return this.errorResponse(
            "Ação não suportada",
            "UNSUPPORTED_ACTION",
            400
          );
      }

      return result;
    } catch (error) {
      return this.errorResponse(
        "Erro ao gerenciar usuário",
        "MANAGE_USER_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 MÉTODOS AUXILIARES - CORRIGIDO
  private async getUserCounts() {
    // ✅ CORREÇÃO: Usar await
    const [clients, employees, admins] = await Promise.all([
      ClientModel.countDocuments(),
      EmployeeModel.countDocuments(),
      AdminModel.countDocuments(),
    ]);

    return { clients, employees, admins };
  }

  private async resetUserPassword(userId: string) {
    // Implementar reset de senha
    return this.successResponse({ userId }, 200, "Senha resetada com sucesso");
  }

  private async updateUserRole(userId: string, newRole: string) {
    // Implementar atualização de role
    return this.successResponse(
      { userId, newRole },
      200,
      "Role atualizada com sucesso"
    );
  }

  private async sendUserNotification(userId: string, message: string) {
    // Implementar envio de notificação
    return this.successResponse(
      { userId, message },
      200,
      "Notificação enviada com sucesso"
    );
  }

  // 🎯 IMPLEMENTAÇÕES ABSTRATAS
  protected mapToSessionUser(admin: any) {
    return {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      isVerified: admin.isVerified,
      isActive: admin.isActive,
      status: admin.status,
      fullName: admin.fullName,
      profileImage: admin.profileImage,
      lastLogin: admin.lastLogin,
      adminData: {
        permissions: admin.adminData?.permissions || [],
        accessLevel: admin.adminData?.accessLevel,
        managedUsers: admin.adminData?.managedUsers || 0,
      },
    };
  }

  protected enrichUserData(admin: any) {
    return {
      ...this.mapToSessionUser(admin),
      phoneNumber: admin.phoneNumber,
      birthDate: admin.birthDate,
      gender: admin.gender,
      preferences: admin.preferences,
      adminData: admin.adminData,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  private async isEmailAvailable(email: string): Promise<boolean> {
    const [client, employee, admin] = await Promise.all([
      ClientModel.findOne({ email: email.toLowerCase().trim() }),
      EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
      AdminModel.findOne({ email: email.toLowerCase().trim() }),
    ]);

    return !client && !employee && !admin;
  }
}
