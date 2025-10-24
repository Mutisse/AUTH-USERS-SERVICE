// AUTH-USERS-SERVICE/src/services/user/base/UserBase.service.ts
import { UserStatus } from "../../../models/interfaces/user.roles";

export abstract class UserBaseService {
  protected abstract userModel: any;

  // ✅ MÉTODOS DE RESPOSTA PADRÃO
  protected successResponse(
    data: any,
    statusCode: number = 200,
    message?: string
  ) {
    return {
      success: true,
      data,
      message,
      statusCode,
    };
  }

  protected errorResponse(
    error: string,
    code: string,
    statusCode: number = 400,
    details?: any
  ) {
    return {
      success: false,
      error,
      code,
      statusCode,
      details,
    };
  }

  // ✅ MÉTODO ABSTRATO PARA ENRIQUECER DADOS DO USUÁRIO
  protected abstract enrichUserData(user: any): any;

  // ✅ MÉTODO ABSTRATO PARA MAPEAR PARA SESSÃO
  protected abstract mapToSessionUser(user: any): any;

  // ✅ VERIFICAR DISPONIBILIDADE DE EMAIL
  protected async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return !user;
  }

  // ✅ CRIAR USUÁRIO (método base)
  public async createUser(userData: any) {
    try {
      console.log("🎯 Criando usuário com dados:", {
        email: userData.email,
        firstName: userData.fullName?.firstName,
      });

      // 🎯 VALIDAÇÕES BÁSICAS
      if (!userData.fullName?.firstName) {
        return this.errorResponse("Nome é obrigatório", "INVALID_NAME", 400);
      }

      if (!userData.acceptTerms) {
        return this.errorResponse(
          "Termos devem ser aceitos",
          "TERMS_NOT_ACCEPTED",
          400
        );
      }

      if (!(await this.isEmailAvailable(userData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      // ✅ CRIAR USUÁRIO (implementação específica nas classes filhas)
      const result = await this.createSpecificUser(userData);

      if (!result.success) {
        return result;
      }

      console.log(
        `✅ Usuário criado: ${result.data.user?.id || result.data._id}`
      );

      return this.successResponse(
        result.data,
        201,
        "Usuário criado com sucesso"
      );
    } catch (error) {
      console.error("[UserBaseService] Erro ao criar usuário:", error);
      return this.errorResponse(
        "Erro ao criar usuário",
        "CREATE_USER_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO ABSTRATO PARA CRIAÇÃO ESPECÍFICA
  protected abstract createSpecificUser(userData: any): Promise<any>;

  // ✅ OBTER PERFIL DO USUÁRIO
  public async getProfile(userId: string) {
    try {
      const user = await this.userModel.findById(userId).select("-password");

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(user));
    } catch (error) {
      console.error("[UserBaseService] Erro ao buscar perfil:", error);
      return this.errorResponse(
        "Erro ao buscar perfil",
        "GET_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ ATIVAR CONTA
  public async activateAccount(userId: string) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      user.isVerified = true;
      user.isActive = true;
      user.status = UserStatus.ACTIVE;
      user.emailVerifiedAt = new Date();
      await user.save();

      console.log(`✅ Conta ativada: ${user._id}`);

      return this.successResponse(
        this.enrichUserData(user),
        200,
        "Conta ativada com sucesso"
      );
    } catch (error) {
      console.error("[UserBaseService] Erro ao ativar conta:", error);
      return this.errorResponse(
        "Erro ao ativar conta",
        "ACTIVATION_ERROR",
        500,
        error
      );
    }
  }

  // ✅ SOFT DELETE USER
  public async softDeleteUser(userId: string, deletedBy: string) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      if (user.deletedAt) {
        return this.errorResponse(
          "Usuário já está excluído",
          "USER_ALREADY_DELETED",
          400
        );
      }

      // ✅ SOFT DELETE
      user.deletedAt = new Date();
      user.deletedBy = deletedBy;
      user.isActive = false;
      user.status = UserStatus.DELETED;

      await user.save();

      console.log(`✅ Usuário soft-deleted: ${userId} por ${deletedBy}`);

      return this.successResponse(
        {
          id: user._id.toString(),
          email: user.email,
          deletedAt: user.deletedAt,
          deletedBy: user.deletedBy,
          status: user.status,
        },
        200,
        "Usuário excluído com sucesso"
      );
    } catch (error) {
      console.error("[UserBaseService] Erro no soft delete:", error);
      return this.errorResponse(
        "Erro ao excluir usuário",
        "SOFT_DELETE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ RESTAURAR USER
  public async restoreUser(userId: string) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      if (!user.deletedAt) {
        return this.errorResponse(
          "Usuário não está excluído",
          "USER_NOT_DELETED",
          400
        );
      }

      // ✅ RESTAURAR
      user.deletedAt = undefined;
      user.deletedBy = undefined;
      user.isActive = true;
      user.status = UserStatus.ACTIVE;

      await user.save();

      console.log(`✅ Usuário restaurado: ${userId}`);

      return this.successResponse(
        this.enrichUserData(user),
        200,
        "Usuário restaurado com sucesso"
      );
    } catch (error) {
      console.error("[UserBaseService] Erro ao restaurar usuário:", error);
      return this.errorResponse(
        "Erro ao restaurar usuário",
        "RESTORE_USER_ERROR",
        500,
        error
      );
    }
  }

  // ✅ DELETAR PERMANENTEMENTE (HARD DELETE - APENAS ADMIN)
  public async hardDeleteUser(userId: string) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      // ✅ HARD DELETE
      await this.userModel.findByIdAndDelete(userId);

      console.log(`🗑️ Usuário hard-deleted: ${userId}`);

      return this.successResponse(
        {
          id: userId,
          message: "Usuário excluído permanentemente",
        },
        200,
        "Usuário excluído permanentemente"
      );
    } catch (error) {
      console.error("[UserBaseService] Erro no hard delete:", error);
      return this.errorResponse(
        "Erro ao excluir usuário permanentemente",
        "HARD_DELETE_ERROR",
        500,
        error
      );
    }
  }

  // ✅ ATUALIZAR STATUS DO USUÁRIO
  public async updateUserStatus(userId: string, status: UserStatus) {
    try {
      const validStatuses = Object.values(UserStatus);
      if (!validStatuses.includes(status)) {
        return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
      }

      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            $set: {
              status,
              isActive: status === UserStatus.ACTIVE,
              ...(status !== UserStatus.ACTIVE && {
                deactivatedAt: new Date(),
              }),
            },
          },
          { new: true, runValidators: true }
        )
        .select("-password");

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(user),
        200,
        `Status do usuário atualizado para ${status}`
      );
    } catch (error) {
      console.error("[UserBaseService] Erro ao atualizar status:", error);
      return this.errorResponse(
        "Erro ao atualizar status",
        "UPDATE_STATUS_ERROR",
        500,
        error
      );
    }
  }

  // ✅ LISTAR USUÁRIOS (PAGINAÇÃO)
  public async listUsers(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    try {
      const { page, limit, search, status } = options;
      const skip = (page - 1) * limit;

      let query: any = {};

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { "fullName.firstName": { $regex: search, $options: "i" } },
          { "fullName.lastName": { $regex: search, $options: "i" } },
        ];
      }

      if (status) {
        query.status = status;
      }

      const users = await this.userModel
        .find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await this.userModel.countDocuments(query);

      return this.successResponse({
        users: users.map((user: any) => this.enrichUserData(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[UserBaseService] Erro ao listar usuários:", error);
      return this.errorResponse(
        "Erro ao listar usuários",
        "LIST_USERS_ERROR",
        500,
        error
      );
    }
  }

  // ✅ BUSCAR USUÁRIO POR EMAIL
  public async findByEmail(email: string) {
    try {
      const user = await this.userModel
        .findOne({
          email: email.toLowerCase().trim(),
        })
        .select("-password");

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(user));
    } catch (error) {
      console.error("[UserBaseService] Erro ao buscar usuário:", error);
      return this.errorResponse(
        "Erro ao buscar usuário",
        "FIND_USER_ERROR",
        500,
        error
      );
    }
  }

  // ✅ ATUALIZAR ÚLTIMO LOGIN
  public async updateLastLogin(userId: string) {
    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: { lastLogin: new Date() } },
          { new: true }
        )
        .select("-password");

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        lastLogin: user.lastLogin,
        message: "Último login atualizado",
      });
    } catch (error) {
      console.error("[UserBaseService] Erro ao atualizar último login:", error);
      return this.errorResponse(
        "Erro ao atualizar último login",
        "UPDATE_LOGIN_ERROR",
        500,
        error
      );
    }
  }
}
