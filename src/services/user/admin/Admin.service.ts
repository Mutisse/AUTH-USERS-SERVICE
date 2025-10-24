// AUTH-USERS-SERVICE/src/services/user/admin/Admin.service.ts
import bcrypt from "bcryptjs";
import { UserBaseService } from "../base/UserBase.service";
import { AdminModel } from "../../../models/user/admin/Admin.model";
import {
  UserMainRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import generateCustomUserId from "../../../utils/generateCustomUserId";

export class AdminService extends UserBaseService {
  protected userModel = AdminModel;

  // ✅ IMPLEMENTAÇÕES DOS MÉTODOS ABSTRATOS OBRIGATÓRIOS
  protected mapToSessionUser(admin: any) {
    return {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      isVerified: admin.isVerified,
      isActive: admin.isActive,
      status: admin.status,
      fullName: admin.fullName,
      lastLogin: admin.lastLogin,
      adminData: {
        permissions: admin.adminData?.permissions || [],
        accessLevel: admin.adminData?.accessLevel || "limited",
        managedUsers: admin.adminData?.managedUsers || 0,
        systemNotifications: admin.adminData?.systemNotifications || false,
      },
    };
  }

  protected enrichUserData(admin: any) {
    return {
      ...this.mapToSessionUser(admin),
      phoneNumber: admin.phoneNumber,
      birthDate: admin.birthDate,
      gender: admin.gender,
      address: admin.address,
      preferences: admin.preferences,
      adminData: admin.adminData,
      acceptTerms: admin.acceptTerms,
      emailVerifiedAt: admin.emailVerifiedAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  // ✅ IMPLEMENTAÇÃO DO MÉTODO ABSTRATO createSpecificUser
  protected async createSpecificUser(adminData: any) {
    try {
      console.log("🎯 Criando admin com dados:", {
        email: adminData.email,
        firstName: adminData.fullName?.firstName,
        acceptTerms: adminData.acceptTerms,
      });

      // 🎯 VALIDAÇÕES
      if (!adminData.fullName?.firstName) {
        return this.errorResponse("Nome é obrigatório", "INVALID_NAME", 400);
      }

      if (!adminData.acceptTerms) {
        return this.errorResponse(
          "Termos devem ser aceitos",
          "TERMS_NOT_ACCEPTED",
          400
        );
      }

      if (!(await this.isEmailAvailable(adminData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      // 🎯 GERAR ID E HASH PASSWORD
      const adminId = generateCustomUserId(UserMainRole.ADMINSYSTEM);
      const hashedPassword = await bcrypt.hash(adminData.password, 12);

      // 🎯 CRIAR ADMIN
      const newAdmin = await AdminModel.create({
        _id: adminId,
        email: adminData.email.toLowerCase().trim(),
        password: hashedPassword,
        role: UserMainRole.ADMINSYSTEM,
        status: adminData.status || UserStatus.ACTIVE, // ✅ Admin já ativo por padrão
        isActive: adminData.isActive !== undefined ? adminData.isActive : true,
        isVerified:
          adminData.isVerified !== undefined ? adminData.isVerified : true,
        fullName: {
          firstName: adminData.fullName.firstName.trim(),
          lastName: adminData.fullName.lastName?.trim() || "",
          displayName: `${adminData.fullName.firstName.trim()} ${
            adminData.fullName.lastName?.trim() || ""
          }`.trim(),
        },
        phoneNumber: adminData.phoneNumber?.trim(),
        acceptTerms: adminData.acceptTerms,
        adminData: {
          permissions: adminData.adminData?.permissions || ["read", "write"],
          accessLevel: adminData.adminData?.accessLevel || "limited",
          managedUsers: 0,
          systemNotifications: true,
          lastSystemAccess: new Date(),
        },
        preferences: {
          theme: "dark", // ✅ Admin tem dark theme por padrão
          notifications: {
            email: true,
            push: true,
            sms: false,
            whatsapp: false,
          },
          language: "pt-MZ",
          timezone: "UTC",
        },
      });

      console.log(`✅ Admin criado: ${newAdmin._id}`);

      const adminResponse = this.enrichUserData(newAdmin);

      return this.successResponse(
        {
          user: adminResponse,
          tokens: {
            accessToken: `eyJ_admin_${Date.now()}`,
            refreshToken: `eyJ_refresh_admin_${Date.now()}`,
            expiresIn: 3600,
          },
        },
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

  // ✅ MÉTODO PÚBLICO PARA CRIAR ADMIN (mantido para compatibilidade)
  public async createAdmin(adminData: any) {
    return this.createSpecificUser(adminData);
  }

  // 🎯 2. ATIVAR CONTA (para casos específicos)
  public async activateAccount(adminId: string) {
    try {
      const admin = await AdminModel.findById(adminId);
      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      admin.isVerified = true;
      admin.isActive = true;
      admin.status = UserStatus.ACTIVE;
      admin.emailVerifiedAt = new Date();
      await admin.save();

      console.log(`✅ Conta ativada: ${admin._id}`);

      return this.successResponse(
        this.enrichUserData(admin),
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

  // 🎯 3. ATUALIZAR PERMISSÕES
  public async updatePermissions(adminId: string, permissions: string[]) {
    try {
      const admin = await AdminModel.findByIdAndUpdate(
        adminId,
        { $set: { "adminData.permissions": permissions } },
        { new: true }
      );

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        permissions: admin.adminData.permissions,
        message: "Permissões atualizadas",
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar permissões",
        "UPDATE_PERMISSIONS_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 4. ATUALIZAR NÍVEL DE ACESSO
  public async updateAccessLevel(
    adminId: string,
    accessLevel: "full" | "limited" | "readonly"
  ) {
    try {
      const validAccessLevels = ["full", "limited", "readonly"];
      if (!validAccessLevels.includes(accessLevel)) {
        return this.errorResponse(
          "Nível de acesso inválido",
          "INVALID_ACCESS_LEVEL",
          400
        );
      }

      const admin = await AdminModel.findByIdAndUpdate(
        adminId,
        { $set: { "adminData.accessLevel": accessLevel } },
        { new: true }
      );

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        accessLevel: admin.adminData.accessLevel,
        message: "Nível de acesso atualizado",
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar nível de acesso",
        "UPDATE_ACCESS_LEVEL_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 5. REGISTRAR ACESSO AO SISTEMA
  public async recordSystemAccess(adminId: string) {
    try {
      const admin = await AdminModel.findByIdAndUpdate(
        adminId,
        {
          $set: { "adminData.lastSystemAccess": new Date() },
          $inc: { "adminData.managedUsers": 0 }, // Placeholder para futuras estatísticas
        },
        { new: true }
      );

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        lastSystemAccess: admin.adminData.lastSystemAccess,
        message: "Acesso ao sistema registrado",
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao registrar acesso",
        "RECORD_ACCESS_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 6. LISTAR ADMINS
  public async listAdmins(options: {
    page: number;
    limit: number;
    search?: string;
    accessLevel?: string;
  }) {
    try {
      const { page, limit, search, accessLevel } = options;
      const skip = (page - 1) * limit;

      let query: any = { role: UserMainRole.ADMINSYSTEM };

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { "fullName.firstName": { $regex: search, $options: "i" } },
          { "fullName.lastName": { $regex: search, $options: "i" } },
        ];
      }

      if (accessLevel) {
        query["adminData.accessLevel"] = accessLevel;
      }

      const admins = await AdminModel.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await AdminModel.countDocuments(query);

      return this.successResponse({
        admins: admins.map((admin) => this.enrichUserData(admin)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[AdminService] Erro ao listar admins:", error);
      return this.errorResponse(
        "Erro ao listar admins",
        "LIST_ADMINS_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 7. ATUALIZAR STATUS DO ADMIN
  public async updateAdminStatus(adminId: string, status: string) {
    try {
      const validStatuses = Object.values(UserStatus);
      if (!validStatuses.includes(status as UserStatus)) {
        return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
      }

      const admin = await AdminModel.findByIdAndUpdate(
        adminId,
        {
          $set: {
            status,
            isActive: status === UserStatus.ACTIVE,
            ...(status !== UserStatus.ACTIVE && { deactivatedAt: new Date() }),
          },
        },
        { new: true, runValidators: true }
      ).select("-password");

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(admin),
        200,
        `Status do admin atualizado para ${status}`
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

  // ✅ MÉTODO AUXILIAR PARA VERIFICAR EMAIL (PROTECTED em vez de PRIVATE)
  protected async isEmailAvailable(email: string): Promise<boolean> {
    const admin = await AdminModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return !admin;
  }

  // ✅ MÉTODO PARA BUSCAR ADMIN POR EMAIL
  public async findByEmail(email: string) {
    try {
      const admin = await AdminModel.findOne({
        email: email.toLowerCase().trim(),
      }).select("-password");

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(admin));
    } catch (error) {
      console.error("[AdminService] Erro ao buscar admin:", error);
      return this.errorResponse(
        "Erro ao buscar admin",
        "FIND_ADMIN_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO PARA ATUALIZAR DADOS DO ADMIN
  public async updateAdmin(adminId: string, updateData: any) {
    try {
      const admin = await AdminModel.findByIdAndUpdate(
        adminId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!admin) {
        return this.errorResponse(
          "Admin não encontrado",
          "ADMIN_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(admin),
        200,
        "Admin atualizado com sucesso"
      );
    } catch (error) {
      console.error("[AdminService] Erro ao atualizar admin:", error);
      return this.errorResponse(
        "Erro ao atualizar admin",
        "UPDATE_ADMIN_ERROR",
        500,
        error
      );
    }
  }
}
