import bcrypt from "bcryptjs";
import { Model, Document } from "mongoose";
import { UserStatus } from "../../../models/interfaces/user.roles";

export abstract class UserBaseService {
  protected abstract userModel: Model<any & Document>;

  public async authenticate(email: string, password: string) {
    try {
      const user = await this.findUserForAuth(email);
      if (!user) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      if (user.isDeleted || !user.isActive) {
        return this.errorResponse(
          "Conta desativada ou excluída",
          "ACCOUNT_DISABLED",
          423
        );
      }

      if (!(await this.validatePassword(user, password))) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      const updatedUser = await this.updateUserAfterLogin(user._id);
      return this.successResponse(this.mapToSessionUser(updatedUser));
    } catch (error) {
      return this.errorResponse(
        "Erro na autenticação",
        "AUTHENTICATION_ERROR",
        500
      );
    }
  }

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

      if (user.isDeleted) {
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

  protected async findUserForAuth(email: string) {
    try {
      const user = await this.userModel
        .findOne({
          email: email.toLowerCase().trim(),
          isDeleted: { $ne: true },
        })
        .select("+password")
        .exec();
      return user && user.password ? user : null;
    } catch (error) {
      return null;
    }
  }

  protected async validatePassword(
    user: any,
    password: string
  ): Promise<boolean> {
    return user.password ? bcrypt.compare(password, user.password) : false;
  }

  protected async updateUserAfterLogin(userId: string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            lastLogin: new Date(),
            lastActivity: new Date(),
            failedLoginAttempts: 0,
          },
          $inc: { loginCount: 1 },
        },
        { new: true }
      )
      .exec();
  }

  protected abstract mapToSessionUser(user: any): any;
  protected abstract enrichUserData(user: any): any;

  protected successResponse(
    data: any,
    statusCode: number = 200,
    message?: string
  ) {
    return {
      success: true,
      data,
      statusCode,
      ...(message && { message }),
    };
  }

  protected errorResponse(
    error: string,
    code: string,
    statusCode: number,
    details?: any
  ) {
    return {
      success: false,
      error,
      code,
      statusCode,
      ...(details && { details }),
    };
  }

  // 🆕 MÉTODO PARA EXCLUSÃO LÓGICA
  public async softDeleteUser(userId: string, deletedBy?: string) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      // Verificar se o método softDelete existe
      if (typeof (user as any).softDelete === "function") {
        await (user as any).softDelete(deletedBy);
      } else {
        // Fallback: atualização manual
        await this.userModel.findByIdAndUpdate(userId, {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy,
          isActive: false,
          status: UserStatus.INACTIVE,
        });
      }

      return this.successResponse(
        {
          id: userId,
          deleted: true,
          deletedAt: new Date(),
        },
        200,
        "Usuário excluído com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro ao excluir usuário",
        "DELETE_USER_ERROR",
        500,
        error
      );
    }
  }

  // 🆕 MÉTODO PARA RESTAURAR USUÁRIO - VERSÃO SIMPLIFICADA
  public async restoreUser(userId: string) {
    try {
      // 🆕 USAR MÉTODO ESTÁTICO SE DISPONÍVEL, SENÃO BUSCAR DIRETAMENTE
      let user;

      if (
        typeof (this.userModel as any).findByIdIncludeDeleted === "function"
      ) {
        user = await (this.userModel as any).findByIdIncludeDeleted(userId);
      } else {
        // Buscar incluindo deletados manualmente
        user = await this.userModel
          .findOne({
            _id: userId,
            isDeleted: true,
          })
          .setOptions({ includeDeleted: true });
      }

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado ou não está excluído",
          "USER_NOT_FOUND",
          404
        );
      }

      // Restaurar o usuário
      if (typeof user.restore === "function") {
        await user.restore();
      } else {
        await this.userModel.findByIdAndUpdate(userId, {
          isDeleted: false,
          isActive: true,
          status: UserStatus.ACTIVE,
          $unset: {
            deletedAt: 1,
            deletedBy: 1,
          },
        });
      }

      // Buscar usuário atualizado
      const updatedUser = await this.userModel.findById(userId);

      return this.successResponse(
        this.enrichUserData(updatedUser),
        200,
        "Usuário restaurado com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro ao restaurar usuário",
        "RESTORE_USER_ERROR",
        500,
        error
      );
    }
  }

  // 🆕 MÉTODO ALTERNATIVO MAIS SIMPLES PARA RESTAURAR
  public async restoreUserSimple(userId: string) {
    try {
      const result = await this.userModel.updateOne(
        {
          _id: userId,
          isDeleted: true,
        },
        {
          $set: {
            isDeleted: false,
            isActive: true,
            status: UserStatus.ACTIVE,
          },
          $unset: {
            deletedAt: "",
            deletedBy: "",
          },
        }
      );

      if (result.modifiedCount === 0) {
        return this.errorResponse(
          "Usuário não encontrado ou não está excluído",
          "USER_NOT_FOUND",
          404
        );
      }

      const user = await this.userModel.findById(userId);
      return this.successResponse(
        this.enrichUserData(user),
        200,
        "Usuário restaurado com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro ao restaurar usuário",
        "RESTORE_USER_ERROR",
        500,
        error
      );
    }
  }
}
