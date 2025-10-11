import bcrypt from "bcryptjs";
import { Model, Document } from "mongoose";

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
        .findOne({ email: email.toLowerCase().trim() })
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
          $set: { lastLogin: new Date(), lastActivity: new Date() },
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
}
