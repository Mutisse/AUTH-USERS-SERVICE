import bcrypt from "bcrypt";
import NodeCache from "node-cache";
import { UserModel } from "../models/user.model";
import {
  UserDocument,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  UserResponse,
  UserMainRole,
  EmployeeSubRole,
  UserStatus,
  Role,
  SessionUser,
  CompleteUser,
  UserPreferences,
  VerificationResponse,
} from "../models/interfaces/interfaces.user";
import generateCustomUserId from "../utils/generateCustomUserId";

const AUTH_CONFIG = {
  SALT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME: 30 * 60 * 1000,
  PASSWORD_RESET_EXPIRY: 24 * 60 * 60 * 1000,
  EMAIL_VERIFICATION_EXPIRY: 72 * 60 * 60 * 1000,
  ONLINE_THRESHOLD: 5 * 60 * 1000,
  CACHE_TTL: 3600,
};

const userCache = new NodeCache({ stdTTL: AUTH_CONFIG.CACHE_TTL });

export class UserService {
  // === Métodos Públicos === //

  public async createUser(
    userData: CreateUserDto & { fullname?: string; originalRole?: string }
  ): Promise<UserResponse<SessionUser>> {
    try {
      // ✅ CORREÇÃO: Processa o campo 'fullname' (minúsculo) primeiro
      if (userData.fullname && typeof userData.fullname === "string") {
        userData.fullName = this.splitFullName(userData.fullname);
        delete userData.fullname; // Remove o campo antigo
      }

      // ✅ Se ainda for string, converte
      if (userData.fullName && typeof userData.fullName === "string") {
        userData.fullName = this.splitFullName(userData.fullName);
      }

      // ✅ Verificação de segurança
      if (!userData.fullName || !userData.fullName.firstName) {
        return this.errorResponse(
          "Nome completo é obrigatório",
          "INVALID_NAME",
          400
        );
      }

      // ✅ RECEBE O ROLE JÁ NORMALIZADO DO USERCONTROLLER
      const normalizedUserData = {
        ...userData,
        role: userData.role, // ← Já está normalizado pelo Controller
        subRole: this.extractSubRole(userData.role, userData.originalRole), // ← Extrai subRole
      };

      const validation = this.validateUserData(normalizedUserData);
      if (!validation.valid) {
        return this.errorResponse(validation.error!, validation.code!, 400);
      }

      if (!(await this.isEmailAvailable(normalizedUserData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      // ✅ GERA ID PERSONALIZADO
      let userId = generateCustomUserId(normalizedUserData.role as Role);

      // ✅ VERIFICA SE O ID JÁ EXISTE
      const existingUserWithId = await UserModel.findById(userId);
      if (existingUserWithId) {
        const newUserId = generateCustomUserId(normalizedUserData.role as Role);
        console.warn(`ID ${userId} já existe, usando novo ID: ${newUserId}`);
        userId = newUserId;
      }

      const hashedPassword = await bcrypt.hash(
        normalizedUserData.password,
        AUTH_CONFIG.SALT_ROUNDS
      );

      const newUser = await UserModel.create({
        _id: userId,
        ...normalizedUserData,
        password: hashedPassword,
        status: normalizedUserData.status || UserStatus.ACTIVE,
        isActive: normalizedUserData.isActive ?? true,
        isVerified: false,
        preferences: this.getDefaultPreferences(normalizedUserData.role),
        verification: {
          email: false,
          phone: false,
        },
        passwordHistory: [
          {
            password: hashedPassword,
            changedAt: new Date(),
          },
        ],
        phoneNumber: normalizedUserData.phoneNumber,
        fullName: {
          ...normalizedUserData.fullName,
          display:
            normalizedUserData.fullName.display ||
            `${normalizedUserData.fullName.firstName} ${normalizedUserData.fullName.lastName}`.trim(),
        },
      });

      console.log(
        `✅ Usuário criado com ID: ${newUser._id}, Role: ${newUser.role}, SubRole: ${newUser.subRole}`
      );

      return this.successResponse(
        this.mapToSessionUser(newUser),
        201,
        "Usuário criado com sucesso"
      );
    } catch (error) {
      console.error("[UserService] Erro ao criar usuário:", error);

      if (error instanceof Error && error.message.includes("duplicate key")) {
        return this.errorResponse(
          "Erro ao criar usuário: ID já existe",
          "DUPLICATE_USER_ID",
          409
        );
      }

      return this.errorResponse(
        "Erro ao criar usuário",
        "CREATE_USER_ERROR",
        500,
        error
      );
    }
  }

  public async getCompleteUserData(
    userId: string
  ): Promise<UserResponse<CompleteUser>> {
    try {
      const cachedUser = userCache.get<CompleteUser>(userId);
      if (cachedUser) {
        return this.successResponse(cachedUser);
      }

      const user = await UserModel.findById(userId)
        .select("-password -__v -verificationToken -passwordResetToken")
        .lean();

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      await this.recordUserActivity(userId);
      const completeUser = this.enrichUserData(user);

      userCache.set(userId, completeUser);
      return this.successResponse(completeUser);
    } catch (error) {
      console.error("[UserService] Erro ao buscar usuário:", error);
      return this.errorResponse(
        "Erro ao buscar usuário",
        "GET_USER_ERROR",
        500,
        error
      );
    }
  }

  public async updateUser(
    userId: string,
    updateData: UpdateUserDto
  ): Promise<UserResponse<CompleteUser>> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      userCache.del(userId);
      if (updateData.email) {
        userCache.del(user.email);
      }

      return this.successResponse(this.mapToCompleteUser(user));
    } catch (error) {
      console.error("[UserService] Erro ao atualizar usuário:", error);
      return this.errorResponse(
        "Erro ao atualizar usuário",
        "UPDATE_USER_ERROR",
        500,
        error
      );
    }
  }

  public async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserResponse<CompleteUser>> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true }
      ).select("-password");

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      userCache.del(userId);
      return this.successResponse(this.mapToCompleteUser(user));
    } catch (error) {
      console.error("[UserService] Erro ao atualizar preferências:", error);
      return this.errorResponse(
        "Erro ao atualizar preferências",
        "UPDATE_PREFERENCES_ERROR",
        500,
        error
      );
    }
  }

  public async verifyEmail(
    token: string,
    email: string
  ): Promise<UserResponse<VerificationResponse>> {
    try {
      const user = await UserModel.findOne({
        email,
        verificationToken: token,
        verificationExpires: { $gt: new Date() },
      });

      if (!user) {
        return this.errorResponse(
          "Token inválido ou expirado",
          "INVALID_VERIFICATION_TOKEN",
          400
        );
      }

      const updatedUser = await UserModel.findByIdAndUpdate(
        user._id,
        {
          $set: {
            isVerified: true,
            "verification.email": true,
            verificationToken: null,
            verificationExpires: null,
          },
        },
        { new: true }
      );

      userCache.del(user._id.toString());
      return this.successResponse(this.getVerificationStatus(updatedUser!));
    } catch (error) {
      console.error("[UserService] Erro ao verificar email:", error);
      return this.errorResponse(
        "Erro ao verificar email",
        "EMAIL_VERIFICATION_ERROR",
        500,
        error
      );
    }
  }

  public async updateOnlineStatus(
    userId: string,
    isOnline: boolean
  ): Promise<UserResponse<CompleteUser>> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { isOnline } },
        { new: true }
      );

      if (!user) {
        return this.errorResponse(
          "Usuário não encontrado",
          "USER_NOT_FOUND",
          404
        );
      }

      userCache.del(userId);
      return this.successResponse(this.mapToCompleteUser(user));
    } catch (error) {
      console.error("[UserService] Erro ao atualizar status online:", error);
      return this.errorResponse(
        "Erro ao atualizar status",
        "UPDATE_STATUS_ERROR",
        500,
        error
      );
    }
  }

  // === Métodos de Autenticação === //

  public async authenticate(
    credentials: LoginDto
  ): Promise<UserResponse<SessionUser>> {
    try {
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return this.errorResponse(validation.error!, validation.code!, 400);
      }

      const email = credentials.email.toLowerCase().trim();
      const user = await this.findUserForAuth(email);

      if (!user) {
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      if (this.isAccountLocked(user)) {
        return this.errorResponse(
          "Conta temporariamente bloqueada",
          "ACCOUNT_LOCKED",
          423
        );
      }

      if (!(await this.validatePassword(user, credentials.password))) {
        await this.recordFailedAttempt(user._id);
        return this.errorResponse(
          "Credenciais inválidas",
          "INVALID_CREDENTIALS",
          401
        );
      }

      const updatedUser = await this.updateUserAfterLogin(user._id);
      userCache.del(user._id.toString());

      const sessionUser = this.mapToSessionUser(updatedUser);
      return this.successResponse(sessionUser);
    } catch (error) {
      console.error("[Auth] Erro na autenticação:", error);
      return this.errorResponse(
        "Erro durante a autenticação",
        "AUTHENTICATION_ERROR",
        500
      );
    }
  }

  // === MÉTODOS AUXILIARES === //

  private extractSubRole(mainRole: string, userData: any): string | null {
    // Se já temos um subRole definido nos dados do usuário, retorna ele
    if (userData.subRole) {
      return userData.subRole;
    }

    // Se for employee e não tiver subRole definido, verifica se há originalRole
    if (mainRole === UserMainRole.EMPLOYEE && userData.originalRole) {
      if (userData.originalRole === "salon_owner")
        return EmployeeSubRole.SALON_OWNER;
      if (userData.originalRole === "salon_staff") return EmployeeSubRole.STAFF;
      // Adicione outros subRoles conforme necessário
    }

    // Se for employee sem originalRole específico, retorna salon_owner como padrão
    if (mainRole === UserMainRole.EMPLOYEE) {
      return EmployeeSubRole.SALON_OWNER;
    }

    // Para outros roles, retorna null
    return null;
  }
  private splitFullName(fullname: string): {
    firstName: string;
    lastName: string;
    display: string;
  } {
    const names = fullname.trim().split(/\s+/);
    const firstName = names[0] || "";
    const lastName = names.length > 1 ? names.slice(1).join(" ") : "";
    const display = fullname.trim();

    return {
      firstName,
      lastName,
      display,
    };
  }

  private async findUserForAuth(email: string): Promise<UserDocument | null> {
    try {
      if (!UserModel || typeof UserModel.findOne !== "function") {
        console.error("UserModel não está disponível");
        return null;
      }

      const user = await UserModel.findOne({
        email: email.toLowerCase().trim(),
      })
        .select("+password +failedLoginAttempts +lastLoginAttempt +isActive")
        .exec();

      if (!user || !user.password) {
        return null;
      }

      return user;
    } catch (error) {
      console.error("[UserService] Erro em findUserForAuth:", error);
      return null;
    }
  }

  private async validatePassword(
    user: UserDocument,
    password: string
  ): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }

  private async updateUserAfterLogin(userId: string): Promise<UserDocument> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          lastLogin: new Date(),
          lastActivity: new Date(),
          failedLoginAttempts: 0,
          lastLoginAttempt: null,
        },
        $inc: { loginCount: 1 },
      },
      { new: true }
    ).exec() as Promise<UserDocument>;
  }

  private enrichUserData(user: UserDocument): CompleteUser {
    return {
      ...this.mapToCompleteUser(user),
      isOnline: this.isUserOnline(user.lastActivity),
      requiresPasswordChange: user.requiresPasswordChange || false,
    };
  }

  private getVerificationStatus(user: UserDocument): VerificationResponse {
    return {
      verified: user.isVerified,
      method: user.verification?.email ? "email" : "phone",
      verifiedAt: user.updatedAt,
      nextVerificationStep: !user.verification?.phone ? "phone" : undefined,
    };
  }

  private validateUserData(userData: CreateUserDto): {
    valid: boolean;
    error?: string;
    code?: string;
  } {
    if (!this.validateEmail(userData.email).valid) {
      return { valid: false, error: "Email inválido", code: "INVALID_EMAIL" };
    }

    if (!userData.password) {
      return {
        valid: false,
        error: "Senha é obrigatória",
        code: "INVALID_PASSWORD",
      };
    }

    if (!this.validateUserRole(userData.role).valid) {
      return {
        valid: false,
        error: "Tipo de usuário inválido",
        code: "INVALID_ROLE",
      };
    }

    return { valid: true };
  }

  private validateCredentials(credentials: LoginDto): {
    valid: boolean;
    error?: string;
    code?: string;
  } {
    if (!credentials.email || !credentials.password) {
      return {
        valid: false,
        error: "Email e senha são obrigatórios",
        code: "MISSING_CREDENTIALS",
      };
    }
    return { valid: true };
  }

  private validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) return { valid: false, error: "Email é obrigatório" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: "Formato de email inválido" };
    }
    return { valid: true };
  }

  private validateUserRole(roleInput: string): {
    valid: boolean;
    error?: string;
  } {
    if (!roleInput)
      return { valid: false, error: "Tipo de usuário é obrigatório" };

    if (!Object.values(UserMainRole).includes(roleInput as UserMainRole)) {
      return { valid: false, error: "Tipo de usuário inválido" };
    }

    return { valid: true };
  }

  private async isEmailAvailable(email: string): Promise<boolean> {
    try {
      if (!UserModel || typeof UserModel.findOne !== "function") {
        console.error("UserModel não está disponível em isEmailAvailable");
        return false;
      }

      const user = await UserModel.findOne({
        email: email.toLowerCase().trim(),
      });
      return !user;
    } catch (error) {
      console.error("[UserService] Erro ao verificar email:", error);
      return false;
    }
  }

  private isAccountLocked(user: UserDocument): boolean {
    return (
      user.failedLoginAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS &&
      user.lastLoginAttempt &&
      Date.now() - user.lastLoginAttempt.getTime() < AUTH_CONFIG.LOCK_TIME
    );
  }

  private isUserOnline(lastActivity?: Date): boolean {
    if (!lastActivity) return false;
    return Date.now() - lastActivity.getTime() < AUTH_CONFIG.ONLINE_THRESHOLD;
  }

  private async recordFailedAttempt(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { failedLoginAttempts: 1 },
      lastLoginAttempt: new Date(),
    });
  }

  private async recordUserActivity(userId: string): Promise<void> {
    await UserModel.updateOne({ _id: userId }, { lastActivity: new Date() });
  }

  private getDefaultPreferences(role?: Role): UserPreferences {
    const basePreferences: UserPreferences = {
      theme: "light",
      notifications: {
        email: true,
        push: true,
        sms: false,
        whatsapp: false,
      },
      language: "pt-MZ",
      timezone: "UTC",
      accessibility: {
        highContrast: false,
        fontSize: 14,
        screenReader: false,
      },
    };

    if (role?.startsWith(UserMainRole.EMPLOYEE)) {
      basePreferences.notifications.whatsapp = true;
      basePreferences.notifications.sms = true;
    }

    return basePreferences;
  }

  private mapToSessionUser(user: UserDocument): SessionUser {
    const firstName = user.fullName?.firstName || "";
    const lastName = user.fullName?.lastName || "";
    const displayName =
      user.fullName?.display && !user.fullName.display.includes("undefined")
        ? user.fullName.display
        : `${firstName} ${lastName}`.trim();

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role as Role,
      subRole: user.subRole,
      isVerified: user.isVerified || false,
      isActive: user.isActive,
      status: user.status,
      fullName: {
        firstName,
        lastName,
        display: displayName,
      },
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
      requiresPasswordChange: user.requiresPasswordChange || false,
    };
  }

  private mapToCompleteUser(user: UserDocument): CompleteUser {
    return {
      ...this.mapToSessionUser(user),
      preferences: user.preferences || this.getDefaultPreferences(user.role),
      phoneNumber: user.phoneNumber,
      birthDate: user.birthDate,
      gender: user.gender,
      address: user.address,
      verification: {
        email: user.verification?.email || false,
        phone: user.verification?.phone || false,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private successResponse<T>(
    data: T,
    statusCode: number = 200,
    message?: string
  ): UserResponse<T> {
    return {
      success: true,
      data,
      statusCode,
      ...(message && { message }),
    };
  }

  private errorResponse(
    error: string,
    code: string,
    statusCode: number,
    details?: any
  ): UserResponse {
    return {
      success: false,
      error,
      code,
      statusCode,
      ...(details && { details }),
    };
  }
}
