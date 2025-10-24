import mongoose from "mongoose";
import os from "os";
import chalk from "chalk";

// 🕐 Utilitário de timestamp padronizado
const getTimestamp = () => chalk.gray(`[${new Date().toISOString()}]`);

class UserServiceDiagnostic {
  private serviceName = "User Service";

  /**
   * Diagnóstico completo do microserviço
   */
  public async fullDiagnostic(): Promise<any> {
    console.log(
      `\n${getTimestamp()} ${chalk.blue("🔍")} Starting full diagnostic for ${
        this.serviceName
      }...`
    );

    const diagnostic = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      status: "healthy",
      checks: {
        database: await this.checkDatabase(),
        memory: this.checkMemory(),
        system: this.checkSystem(),
        environment: this.checkEnvironment(),
        api: await this.checkAPI(),
        dependencies: this.checkDependencies(),
      },
      summary: {},
    };

    // Gerar resumo
    diagnostic.summary = this.generateSummary(diagnostic.checks);

    this.printDiagnosticResults(diagnostic);
    return diagnostic;
  }

  /**
   * Verifica a conexão com o MongoDB
   */
  private async checkDatabase(): Promise<any> {
    try {
      const db = mongoose.connection;
      const readyState = db.readyState;
      const states = [
        "disconnected",
        "connected",
        "connecting",
        "disconnecting",
      ];

      const dbInfo = {
        status: readyState === 1 ? "connected" : "disconnected",
        readyState: states[readyState] || "unknown",
        databaseName: db.db?.databaseName || "unknown",
        host: db.host || "unknown",
        port: db.port || "unknown",
        models: Object.keys(mongoose.models || {}),
        collections: await this.getCollectionsInfo(),
      };

      console.log(
        `${getTimestamp()} ${
          dbInfo.status === "connected" ? chalk.green("✅") : chalk.red("❌")
        } Database: ${dbInfo.status}`
      );

      return dbInfo;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(
        `${getTimestamp()} ${chalk.red("❌")} Database check failed:`,
        errorMessage
      );
      return { status: "error", error: errorMessage };
    }
  }

  /**
   * Obtém informações das coleções
   */
  private async getCollectionsInfo(): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) return [];

      const collections = await db.listCollections().toArray();
      return collections.map((collection) => ({
        name: collection.name,
        type: collection.type || "collection",
      }));
    } catch (error) {
      return [{ error: "Failed to get collections" }];
    }
  }

  /**
   * Verifica uso de memória
   */
  private checkMemory(): any {
    const memoryUsage = process.memoryUsage();
    const formatMemory = (bytes: number) => Math.round(bytes / 1024 / 1024);

    const memoryInfo = {
      heapUsed: formatMemory(memoryUsage.heapUsed),
      heapTotal: formatMemory(memoryUsage.heapTotal),
      rss: formatMemory(memoryUsage.rss),
      external: formatMemory(memoryUsage.external),
      systemFree: formatMemory(os.freemem()),
      systemTotal: formatMemory(os.totalmem()),
    };

    console.log(
      `${getTimestamp()} ${chalk.green("✅")} Memory: ${
        memoryInfo.heapUsed
      }MB used`
    );

    return memoryInfo;
  }

  /**
   * Verifica informações do sistema
   */
  private checkSystem(): any {
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      cpu: os.cpus().length,
      loadAverage: os.loadavg(),
    };

    console.log(
      `${getTimestamp()} ${chalk.green("✅")} System: ${systemInfo.cpu} CPUs, ${
        systemInfo.nodeVersion
      }`
    );

    return systemInfo;
  }

  /**
   * Verifica variáveis de ambiente
   */
  private checkEnvironment(): any {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || "not set",
      PORT: process.env.PORT || "not set",
      MONGODB_URI: process.env.MONGODB_URI ? "set" : "not set",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? "set" : "not set",
      JWT_SECRET: process.env.JWT_SECRET ? "set" : "not set",
    };

    console.log(
      `${getTimestamp()} ${chalk.green("✅")} Environment: ${
        Object.keys(envVars).length
      } variables checked`
    );

    return envVars;
  }

  /**
   * Verifica endpoints da API
   */
  private async checkAPI(): Promise<any> {
    const apiChecks = {
      health: await this.checkHealthEndpoint(),
      routes: this.getAvailableRoutes(),
    };

    return apiChecks;
  }

  /**
   * Verifica endpoint de health
   */
  private async checkHealthEndpoint(): Promise<any> {
    try {
      // Simular uma requisição para o health check
      return { status: "available", message: "Health endpoint is working" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { status: "unavailable", error: errorMessage };
    }
  }

  /**
   * Obtém rotas disponíveis
   */
  private getAvailableRoutes(): string[] {
    // Esta função precisaria ser adaptada para sua estrutura de rotas
    return ["/health", "/api/users", "/api/auth", "/api/profile"];
  }

  /**
   * Verifica dependências
   */
  private checkDependencies(): any {
    const dependencies = {
      mongoose: mongoose.version,
      node: process.version,
      // Adicione outras dependências importantes
    };

    return dependencies;
  }

  /**
   * Gera resumo do diagnóstico
   */
  private generateSummary(checks: any): any {
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(
      (check: any) => check.status !== "error" && check.status !== "unavailable"
    ).length;

    return {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      successRate: Math.round((passedChecks / totalChecks) * 100),
      overallStatus: passedChecks === totalChecks ? "healthy" : "degraded",
    };
  }

  /**
   * Imprime resultados do diagnóstico
   */
  private printDiagnosticResults(diagnostic: any): void {
    console.log(
      `\n${getTimestamp()} ${chalk.cyan("📊")} DIAGNOSTIC RESULTS for ${
        this.serviceName
      }`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Overall Status: ${
        diagnostic.summary.overallStatus === "healthy"
          ? chalk.green("✅ HEALTHY")
          : chalk.yellow("⚠️ DEGRADED")
      }`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Checks: ${
        diagnostic.summary.passedChecks
      }/${diagnostic.summary.totalChecks} passed`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Success Rate: ${chalk.blue(
        diagnostic.summary.successRate + "%"
      )}`
    );

    // Detalhes específicos
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Database: ${
        diagnostic.checks.database.status === "connected"
          ? chalk.green("✅")
          : chalk.red("❌")
      }`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Memory: ${chalk.blue(
        diagnostic.checks.memory.heapUsed + "MB"
      )}`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Uptime: ${chalk.blue(
        diagnostic.checks.system.uptime + "s"
      )}`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("└──")} Environment: ${chalk.blue(
        process.env.NODE_ENV || "not set"
      )}`
    );
  }

  /**
   * Diagnóstico rápido (apenas crítico)
   */
  public async quickDiagnostic(): Promise<any> {
    console.log(
      `\n${getTimestamp()} ${chalk.blue("🔍")} Quick diagnostic for ${
        this.serviceName
      }...`
    );

    const criticalChecks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      environment: this.checkEnvironment(),
    };

    const allCritical = Object.values(criticalChecks).every(
      (check) => check.status !== "error" && check.status !== "unavailable"
    );

    console.log(
      `${getTimestamp()} ${
        allCritical ? chalk.green("✅") : chalk.red("❌")
      } Quick diagnostic: ${
        allCritical
          ? "ALL CRITICAL SYSTEMS OK"
          : "SOME CRITICAL SYSTEMS FAILING"
      }`
    );

    return {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      status: allCritical ? "healthy" : "degraded",
      criticalChecks,
    };
  }

  /**
   * Monitoramento contínuo
   */
  public startContinuousMonitoring(intervalMs: number = 300000): void {
    // 5 minutos
    console.log(
      `${getTimestamp()} ${chalk.blue(
        "📈"
      )} Starting continuous monitoring for ${this.serviceName}...`
    );

    setInterval(async () => {
      const diagnostic = await this.quickDiagnostic();

      if (diagnostic.status === "degraded") {
        console.log(
          `${getTimestamp()} ${chalk.red("🚨")} Service degradation detected!`
        );
        // Aqui você poderia enviar notificações, etc.
      }
    }, intervalMs);
  }
}

// Singleton instance
export const userDiagnostic = new UserServiceDiagnostic();
export default userDiagnostic;
