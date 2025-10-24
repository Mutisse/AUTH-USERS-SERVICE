import { ClientModel } from "../../../models/user/client/Client.model";
import { EmployeeModel } from "../../../models/user/employee/Employee.model";
import { AdminModel } from "../../../models/user/admin/Admin.model";
import {
  UserStatus,
  UserMainRole,
} from "../../../models/interfaces/user.roles";

// ✅ INTERFACES PARA TIPAGEM FORTE
interface EmailVerificationResult {
  exists: boolean;
  isActive: boolean;
  userType?: UserMainRole;
  status?: UserStatus;
  lastLogin?: Date;
  createdAt?: Date;
}

interface CacheItem {
  data: EmailVerificationResult;
  expiry: number;
  hits: number;
}

interface ServiceOptions {
  useCache: boolean;
  cacheTtl: number;
  fallbackOnError: boolean;
  includeUserDetails: boolean;
  timeout: number;
  validateEmail: boolean;
}

export class EmailVerificationService {
  private cache: Map<string, CacheItem> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutos

  // ✅ CONFIGURAÇÃO FLEXÍVEL
  private readonly DEFAULT_OPTIONS: ServiceOptions = {
    useCache: true,
    cacheTtl: this.DEFAULT_CACHE_TTL,
    fallbackOnError: true,
    includeUserDetails: false,
    timeout: 5000,
    validateEmail: true,
  };

  constructor() {
    this.startCacheCleanup();
  }

  // ✅ VERIFICAÇÃO SIMPLES (SEM CACHE) - MANTIDO PARA COMPATIBILIDADE
  public async checkEmailAvailability(email: string) {
    return this.checkEmailAvailabilityAdvanced(email, { useCache: false });
  }

  // ✅ VERIFICAÇÃO COM CACHE - MANTIDO PARA COMPATIBILIDADE
  public async checkEmailAvailabilityCached(email: string) {
    return this.checkEmailAvailabilityAdvanced(email, { useCache: true });
  }

  // ✅ VERIFICAÇÃO AVANÇADA FLEXÍVEL
  public async checkEmailAvailabilityAdvanced(
    email: string,
    options: Partial<ServiceOptions> = {}
  ) {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    try {
      // ✅ VALIDAÇÃO DE EMAIL (CONFIGURÁVEL)
      if (config.validateEmail && !this.isValidEmail(email)) {
        return this.buildErrorResponse(
          email,
          "Formato de email inválido",
          "INVALID_EMAIL_FORMAT",
          400,
          startTime
        );
      }

      // ✅ VERIFICAÇÃO DE CACHE (CONFIGURÁVEL)
      if (config.useCache) {
        const cached = this.getFromCache(email);
        if (cached) {
          return this.buildSuccessResponse(email, cached, startTime, true);
        }
      }

      // ✅ CONSULTA AO BANCO COM TIMEOUT
      const dbResult = await this.withTimeout(
        this.checkEmailInDatabase(email, config.includeUserDetails),
        config.timeout
      );

      // ✅ ATUALIZA CACHE (SE CONFIGURADO)
      if (config.useCache) {
        this.setToCache(email, dbResult, config.cacheTtl);
      }

      return this.buildSuccessResponse(email, dbResult, startTime, false);
    } catch (error) {
      console.error("[EmailService] Erro ao verificar email:", error);

      // ✅ FALLBACK INTELIGENTE (CONFIGURÁVEL)
      if (config.fallbackOnError) {
        const fallbackResult = await this.getFallbackResult(email, error);
        return this.buildSuccessResponse(
          email,
          fallbackResult,
          startTime,
          false,
          true
        );
      }

      return this.buildErrorResponse(
        email,
        "Erro ao verificar disponibilidade do email",
        "EMAIL_CHECK_ERROR",
        500,
        startTime
      );
    }
  }

  // ✅ MÉTODO PRIVADO PARA VERIFICAR NO BANCO (OTIMIZADO)
  private async checkEmailInDatabase(
    email: string,
    includeDetails: boolean = false
  ): Promise<EmailVerificationResult> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // ✅ CONSULTA PARALELA OTIMIZADA
      const [client, employee, admin] = await Promise.all([
        ClientModel.findOne({ email: normalizedEmail })
          .select(
            includeDetails
              ? "email status isActive lastLogin createdAt"
              : "email status isActive"
          )
          .lean(),
        EmployeeModel.findOne({ email: normalizedEmail })
          .select(
            includeDetails
              ? "email status isActive lastLogin createdAt"
              : "email status isActive"
          )
          .lean(),
        AdminModel.findOne({ email: normalizedEmail })
          .select(
            includeDetails
              ? "email status isActive lastLogin createdAt"
              : "email status isActive"
          )
          .lean(),
      ]);

      const user = client || employee || admin;

      if (!user) {
        return {
          exists: false,
          isActive: false,
          userType: undefined,
          status: undefined,
        };
      }

      // ✅ DETERMINAR TIPO DE USUÁRIO E STATUS
      let userType: UserMainRole | undefined;
      let isActive = false;
      let status: UserStatus | undefined;

      if (client) {
        userType = UserMainRole.CLIENT;
        status = client.status;
        isActive = this.determineAccountStatus(client.status, client.isActive);
      } else if (employee) {
        userType = UserMainRole.EMPLOYEE;
        status = employee.status;
        isActive = this.determineAccountStatus(
          employee.status,
          employee.isActive
        );
      } else if (admin) {
        userType = UserMainRole.ADMINSYSTEM;
        status = admin.status;
        isActive = this.determineAccountStatus(admin.status, admin.isActive);
      }

      const result: EmailVerificationResult = {
        exists: true,
        isActive,
        userType,
        status,
      };

      // ✅ DETALHES ADICIONAIS SE SOLICITADO
      if (includeDetails) {
        result.lastLogin = user.lastLogin;
        result.createdAt = user.createdAt;
      }

      return result;
    } catch (error) {
      console.error("[EmailService] Erro ao consultar banco:", error);
      throw error;
    }
  }

  // ✅ CONSTRUTOR DE RESPOSTAS DE SUCESSO
  private buildSuccessResponse(
    email: string,
    result: EmailVerificationResult,
    startTime: number,
    fromCache: boolean,
    fromFallback: boolean = false
  ) {
    const responseTime = Date.now() - startTime;
    const available = !result.exists || !result.isActive;

    const response = {
      success: true,
      data: {
        email,
        available,
        exists: result.exists,
        isActive: result.isActive,
        userType: result.userType,
        status: result.status,
        canRegister: available,
        fromCache,
        fromFallback,
        reason: this.getReasonMessage(
          result.exists,
          result.isActive,
          result.userType,
          result.status
        ),
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        ...(result.lastLogin && { lastLogin: result.lastLogin }),
        ...(result.createdAt && { createdAt: result.createdAt }),
      },
      statusCode: 200,
      metadata: {
        processedAt: new Date().toISOString(),
        responseTime,
        cacheHit: fromCache,
        fallbackUsed: fromFallback,
      },
    };

    // ✅ LOG DE PERFORMANCE
    if (responseTime > 1000) {
      console.log(`🐌 [SLOW_EMAIL_CHECK] ${email} - ${responseTime}ms`);
    }

    return response;
  }

  // ✅ CONSTRUTOR DE RESPOSTAS DE ERRO
  private buildErrorResponse(
    email: string,
    error: string,
    code: string,
    statusCode: number,
    startTime: number
  ) {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      error,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      metadata: {
        email,
        processedAt: new Date().toISOString(),
        responseTime,
      },
    };
  }

  // ✅ MÉTODO PARA DETERMINAR STATUS DA CONTA (OTIMIZADO)
  private determineAccountStatus(
    status: UserStatus,
    isActive?: boolean
  ): boolean {
    // ✅ MAPEAMENTO DE STATUS PARA ATIVO/INATIVO
    const statusMap: Record<UserStatus, boolean> = {
      [UserStatus.ACTIVE]: true,
      [UserStatus.VERIFIED]: true,
      [UserStatus.ONBOARDING]: true,
      [UserStatus.PROFILE_SETUP]: true,
      [UserStatus.TRIAL]: true,

      [UserStatus.INACTIVE]: false,
      [UserStatus.SUSPENDED]: false,
      [UserStatus.PENDING]: false,
      [UserStatus.PENDING_VERIFICATION]: false,
      [UserStatus.BLOCKED]: false,
      [UserStatus.DELETED]: false,
      [UserStatus.PAYMENT_PENDING]: false,
      [UserStatus.EXPIRED]: false,
    };

    return statusMap[status] ?? (isActive || false);
  }

  // ✅ MÉTODO PARA MENSAGENS DE RAZÃO (OTIMIZADO)
  private getReasonMessage(
    exists: boolean,
    isActive: boolean,
    userType?: UserMainRole,
    status?: UserStatus
  ): string {
    if (!exists) return "Email disponível para registro";

    if (!isActive) {
      const type = userType ? userType.toLowerCase() : "de usuário";
      const statusMsg = status ? ` (status: ${status})` : "";
      return `Conta ${type} existe mas está inativa${statusMsg}`;
    }

    const type = userType ? userType.toLowerCase() : "de usuário";
    const statusMsg = status ? ` (status: ${status})` : "";
    return `Conta ${type} já está ativa e em uso${statusMsg}`;
  }

  // ✅ GERENCIAMENTO DE CACHE AVANÇADO
  private getFromCache(email: string): EmailVerificationResult | undefined {
    const cacheKey = email.toLowerCase().trim();
    const item = this.cache.get(cacheKey);

    if (item && Date.now() < item.expiry) {
      item.hits++;
      return item.data;
    }

    // Remove se expirado
    if (item) {
      this.cache.delete(cacheKey);
    }

    return undefined;
  }

  private setToCache(
    email: string,
    data: EmailVerificationResult,
    ttl: number = this.DEFAULT_CACHE_TTL
  ): void {
    const cacheKey = email.toLowerCase().trim();
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + ttl,
      hits: 0,
    });
  }

  // ✅ LIMPEZA AUTOMÁTICA DE CACHE
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, value] of this.cache.entries()) {
        if (now >= value.expiry) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 [CACHE_CLEANUP] Removidos ${cleaned} itens expirados`);
      }
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  // ✅ VALIDAÇÃO DE EMAIL
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ✅ TIMEOUT FLEXÍVEL
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout excedido")), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // ✅ FALLBACK INTELIGENTE
  private async getFallbackResult(
    email: string,
    error: any
  ): Promise<EmailVerificationResult> {
    // Tenta buscar do cache mesmo com erro
    const cached = this.getFromCache(email);
    if (cached) {
      return {
        ...cached,
        exists: cached.exists,
        isActive: cached.isActive,
      };
    }

    // Fallback conservador - assume que email está disponível
    return {
      exists: false,
      isActive: false,
      userType: undefined,
      status: undefined,
    };
  }

  // ✅ MÉTODOS PÚBLICOS DE GERENCIAMENTO
  public clearCache(email?: string): void {
    if (email) {
      const cacheKey = email.toLowerCase().trim();
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  public getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalHits = 0;

    // ✅ COLETA ENTRIES PARA ESTATÍSTICAS DETALHADAS
    const entries: Array<{
      email: string;
      exists: boolean;
      isActive: boolean;
      userType?: UserMainRole;
      hits: number;
      age: number;
      expiresIn: number;
    }> = [];

    for (const [key, value] of this.cache.entries()) {
      const isExpired = now >= value.expiry;
      const age = now - (value.expiry - this.DEFAULT_CACHE_TTL);
      const expiresIn = value.expiry - now;

      if (!isExpired) {
        validEntries++;
        totalHits += value.hits;

        // ✅ ADICIONA ENTRY PARA ESTATÍSTICAS DETALHADAS
        entries.push({
          email: key,
          exists: value.data.exists,
          isActive: value.data.isActive,
          userType: value.data.userType,
          hits: value.hits,
          age,
          expiresIn,
        });
      } else {
        expiredEntries++;
      }
    }

    return {
      size: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      totalHits,
      averageHits: validEntries > 0 ? totalHits / validEntries : 0,
      ttl: this.DEFAULT_CACHE_TTL,
      entries, // ✅ AGORA ESTA PROPRIEDADE EXISTE
    };
  }
  // ✅ MÉTODO PARA VERIFICAR STATUS ESPECÍFICO
  public getStatusInfo(status: UserStatus): {
    isActive: boolean;
    description: string;
  } {
    const statusInfo: Record<
      UserStatus,
      { isActive: boolean; description: string }
    > = {
      [UserStatus.ACTIVE]: {
        isActive: true,
        description: "Conta ativa e funcionando normalmente",
      },
      [UserStatus.INACTIVE]: {
        isActive: false,
        description: "Conta inativa - precisa ser reativada",
      },
      [UserStatus.SUSPENDED]: {
        isActive: false,
        description: "Conta suspensa temporariamente",
      },
      [UserStatus.PENDING]: {
        isActive: false,
        description: "Aguardando aprovação",
      },
      [UserStatus.PENDING_VERIFICATION]: {
        isActive: false,
        description: "Aguardando verificação de email",
      },
      [UserStatus.VERIFIED]: {
        isActive: true,
        description: "Email verificado - conta ativa",
      },
      [UserStatus.BLOCKED]: {
        isActive: false,
        description: "Conta bloqueada por violação de termos",
      },
      [UserStatus.DELETED]: { isActive: false, description: "Conta excluída" },
      [UserStatus.ONBOARDING]: {
        isActive: true,
        description: "Em processo de onboarding",
      },
      [UserStatus.PROFILE_SETUP]: {
        isActive: true,
        description: "Configurando perfil",
      },
      [UserStatus.PAYMENT_PENDING]: {
        isActive: false,
        description: "Aguardando pagamento",
      },
      [UserStatus.TRIAL]: {
        isActive: true,
        description: "Período de trial ativo",
      },
      [UserStatus.EXPIRED]: { isActive: false, description: "Conta expirada" },
    };

    return (
      statusInfo[status] || {
        isActive: false,
        description: "Status desconhecido",
      }
    );
  }
}
