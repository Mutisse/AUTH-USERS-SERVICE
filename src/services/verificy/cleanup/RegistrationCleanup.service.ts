// AUTH-USERS-SERVICE/src/services/verificy/cleanup/RegistrationCleanup.service.ts
import { ClientModel } from "../../../models/user/client/Client.model";
import { EmployeeModel } from "../../../models/user/employee/Employee.model";
import { AdminModel } from "../../../models/user/admin/Admin.model";
import { EmailVerificationService } from "../email/EmailVerification.service";
import { AppError } from "../../../utils/AppError";

export interface FailedRegistrationData {
  email: string;
  role: string;
  reason: string;
  step: "start_registration" | "otp_verification" | "final_registration";
  data?: any;
  timestamp: Date;
}

export class RegistrationCleanupService {
  private emailService: EmailVerificationService;

  constructor() {
    this.emailService = new EmailVerificationService();
  }

  /**
   * ✅ LIMPAR DADOS DE REGISTRO FALHADO
   */
  public async cleanupFailedRegistration(
    email: string,
    role: string,
    reason: string,
    step: FailedRegistrationData["step"],
    data?: any
  ): Promise<{ success: boolean; cleaned: boolean; message: string }> {
    try {
      console.log(
        `🧹 [CLEANUP] Iniciando limpeza para: ${email}, role: ${role}, motivo: ${reason}`
      );

      const normalizedEmail = email.toLowerCase().trim();

      // ✅ VERIFICAR SE O USUÁRIO EXISTE E ESTÁ EM ESTADO PENDENTE
      const userExists = await this.checkUserExists(normalizedEmail, role);

      if (!userExists.exists) {
        return {
          success: true,
          cleaned: false,
          message: "Usuário não encontrado - nada para limpar",
        };
      }

      // ✅ EXECUTAR LIMPEZA BASEADA NO ROLE
      let cleaned = false;
      let message = "";

      switch (role.toLowerCase()) {
        case "client":
          cleaned = await this.cleanupClient(normalizedEmail, reason);
          message = cleaned
            ? "Cliente removido com sucesso"
            : "Cliente não necessitava de limpeza";
          break;

        case "employee":
          cleaned = await this.cleanupEmployee(normalizedEmail, reason);
          message = cleaned
            ? "Employee removido com sucesso"
            : "Employee não necessitava de limpeza";
          break;

        case "admin":
          cleaned = await this.cleanupAdmin(normalizedEmail, reason);
          message = cleaned
            ? "Admin removido com sucesso"
            : "Admin não necessitava de limpeza";
          break;

        default:
          throw new AppError(
            `Role inválido para limpeza: ${role}`,
            400,
            "INVALID_ROLE"
          );
      }

      // ✅ LIMPAR CACHE DO EMAIL SERVICE
      this.emailService.clearCache(normalizedEmail);

      // ✅ REGISTRAR FALHA PARA ANÁLISE
      await this.recordFailedRegistration({
        email: normalizedEmail,
        role,
        reason,
        step,
        data,
        timestamp: new Date(),
      });

      console.log(`✅ [CLEANUP] Limpeza concluída para: ${email} - ${message}`);

      return {
        success: true,
        cleaned,
        message,
      };
    } catch (error) {
      console.error(`❌ [CLEANUP] Erro na limpeza para ${email}:`, error);

      return {
        success: false,
        cleaned: false,
        message: `Erro na limpeza: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  /**
   * ✅ VERIFICAR SE USUÁRIO EXISTE E ESTÁ EM ESTADO PENDENTE
   */
  private async checkUserExists(
    email: string,
    role: string
  ): Promise<{ exists: boolean; status?: string }> {
    try {
      let user;

      switch (role.toLowerCase()) {
        case "client":
          user = await ClientModel.findOne({ email }).select("status").lean();
          break;
        case "employee":
          user = await EmployeeModel.findOne({ email }).select("status").lean();
          break;
        case "admin":
          user = await AdminModel.findOne({ email }).select("status").lean();
          break;
        default:
          return { exists: false };
      }

      return {
        exists: !!user,
        status: user?.status,
      };
    } catch (error) {
      console.error(`[CLEANUP] Erro ao verificar usuário ${email}:`, error);
      return { exists: false };
    }
  }

  /**
   * ✅ LIMPAR CLIENTE (APENAS SE ESTIVER EM ESTADO PENDENTE)
   */
  private async cleanupClient(email: string, reason: string): Promise<boolean> {
    try {
      // ✅ APENAS REMOVER SE ESTIVER EM ESTADO PENDENTE/INCOMPLETO
      const result = await ClientModel.deleteOne({
        email,
        status: {
          $in: [
            "pending",
            "pending_verification",
            "onboarding",
            "profile_setup",
          ],
        },
      });

      const deleted = result.deletedCount > 0;

      if (deleted) {
        console.log(
          `🗑️ [CLEANUP] Cliente removido: ${email} - Motivo: ${reason}`
        );
      } else {
        console.log(
          `ℹ️ [CLEANUP] Cliente ${email} não necessitava de remoção (status ativo ou já removido)`
        );
      }

      return deleted;
    } catch (error) {
      console.error(`[CLEANUP] Erro ao limpar cliente ${email}:`, error);
      return false;
    }
  }

  /**
   * ✅ LIMPAR EMPLOYEE (APENAS SE ESTIVER EM ESTADO PENDENTE)
   */
  private async cleanupEmployee(
    email: string,
    reason: string
  ): Promise<boolean> {
    try {
      const result = await EmployeeModel.deleteOne({
        email,
        status: {
          $in: [
            "pending",
            "pending_verification",
            "onboarding",
            "profile_setup",
          ],
        },
      });

      const deleted = result.deletedCount > 0;

      if (deleted) {
        console.log(
          `🗑️ [CLEANUP] Employee removido: ${email} - Motivo: ${reason}`
        );
      } else {
        console.log(
          `ℹ️ [CLEANUP] Employee ${email} não necessitava de remoção (status ativo ou já removido)`
        );
      }

      return deleted;
    } catch (error) {
      console.error(`[CLEANUP] Erro ao limpar employee ${email}:`, error);
      return false;
    }
  }

  /**
   * ✅ LIMPAR ADMIN (APENAS SE ESTIVER EM ESTADO PENDENTE)
   */
  private async cleanupAdmin(email: string, reason: string): Promise<boolean> {
    try {
      const result = await AdminModel.deleteOne({
        email,
        status: {
          $in: [
            "pending",
            "pending_verification",
            "onboarding",
            "profile_setup",
          ],
        },
      });

      const deleted = result.deletedCount > 0;

      if (deleted) {
        console.log(
          `🗑️ [CLEANUP] Admin removido: ${email} - Motivo: ${reason}`
        );
      } else {
        console.log(
          `ℹ️ [CLEANUP] Admin ${email} não necessitava de remoção (status ativo ou já removido)`
        );
      }

      return deleted;
    } catch (error) {
      console.error(`[CLEANUP] Erro ao limpar admin ${email}:`, error);
      return false;
    }
  }

  /**
   * ✅ REGISTRAR FALHA PARA ANÁLISE FUTURA (OPCIONAL)
   */
  private async recordFailedRegistration(
    data: FailedRegistrationData
  ): Promise<void> {
    try {
      // ✅ AQUI VOCÊ PODE SALVAR EM UMA COLLECTION ESPECÍFICA PARA ANÁLISE
      // Por enquanto, apenas logamos
      console.log(`📝 [REGISTRATION_FAILURE]`, {
        email: data.email,
        role: data.role,
        reason: data.reason,
        step: data.step,
        timestamp: data.timestamp,
      });

      // ✅ EXEMPLO: Salvar em uma collection de falhas
      // await FailedRegistrationModel.create(data);
    } catch (error) {
      console.error("[CLEANUP] Erro ao registrar falha:", error);
    }
  }

  /**
   * ✅ LIMPEZA EM MASSA (PARA ADMIN/MANUTENÇÃO)
   */
  public async bulkCleanupStaleRegistrations(hoursOld: number = 24): Promise<{
    success: boolean;
    cleaned: {
      clients: number;
      employees: number;
      admins: number;
    };
    message: string;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

      console.log(
        `🧹 [BULK_CLEANUP] Iniciando limpeza de registros com mais de ${hoursOld} horas`
      );

      const [clients, employees, admins] = await Promise.all([
        // ✅ CLIENTES PENDENTES ANTIGOS
        ClientModel.deleteMany({
          status: { $in: ["pending", "pending_verification"] },
          createdAt: { $lt: cutoffDate },
        }),

        // ✅ EMPLOYEES PENDENTES ANTIGOS
        EmployeeModel.deleteMany({
          status: { $in: ["pending", "pending_verification"] },
          createdAt: { $lt: cutoffDate },
        }),

        // ✅ ADMINS PENDENTES ANTIGOS
        AdminModel.deleteMany({
          status: { $in: ["pending", "pending_verification"] },
          createdAt: { $lt: cutoffDate },
        }),
      ]);

      const totalCleaned =
        clients.deletedCount + employees.deletedCount + admins.deletedCount;

      console.log(
        `✅ [BULK_CLEANUP] Concluído: ${totalCleaned} registros removidos`,
        {
          clients: clients.deletedCount,
          employees: employees.deletedCount,
          admins: admins.deletedCount,
        }
      );

      return {
        success: true,
        cleaned: {
          clients: clients.deletedCount,
          employees: employees.deletedCount,
          admins: admins.deletedCount,
        },
        message: `Limpeza concluída: ${totalCleaned} registros antigos removidos`,
      };
    } catch (error) {
      console.error("[BULK_CLEANUP] Erro na limpeza em massa:", error);

      return {
        success: false,
        cleaned: { clients: 0, employees: 0, admins: 0 },
        message: `Erro na limpeza em massa: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  /**
   * ✅ VERIFICAR STATUS DE UM REGISTRO
   */
  public async getRegistrationStatus(email: string): Promise<{
    exists: boolean;
    role?: string;
    status?: string;
    createdAt?: Date;
    needsCleanup: boolean;
  }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // ✅ VERIFICAR EM TODOS OS MODELOS
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: normalizedEmail })
          .select("status createdAt")
          .lean(),
        EmployeeModel.findOne({ email: normalizedEmail })
          .select("status createdAt")
          .lean(),
        AdminModel.findOne({ email: normalizedEmail })
          .select("status createdAt")
          .lean(),
      ]);

      const user = client || employee || admin;

      if (!user) {
        return { exists: false, needsCleanup: false };
      }

      const role = client ? "client" : employee ? "employee" : "admin";
      const status = user.status;
      const pendingStatuses = [
        "pending",
        "pending_verification",
        "onboarding",
        "profile_setup",
      ];
      const needsCleanup = pendingStatuses.includes(status);

      return {
        exists: true,
        role,
        status,
        createdAt: user.createdAt,
        needsCleanup,
      };
    } catch (error) {
      console.error(`[CLEANUP] Erro ao verificar status de ${email}:`, error);
      return { exists: false, needsCleanup: false };
    }
  }
}
