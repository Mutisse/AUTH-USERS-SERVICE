// src/config/server.ts
import dotenv from "dotenv";
dotenv.config();
import app from "../app";
import chalk from "chalk";
import databaseManager from "./database";

// 🕐 Utilitário de timestamp padronizado
const getTimestamp = () => chalk.gray(`[${new Date().toISOString()}]`);

// ⚙️ Configurações
const PORT = parseInt(process.env.PORT || "3001");
const NODE_ENV = process.env.NODE_ENV || "development";

let server: ReturnType<typeof app.listen> | null = null;

/**
 * Inicializa e inicia o servidor
 */
const startServer = async (): Promise<void> => {
  try {
    console.log(`${getTimestamp()} ${chalk.blue("🚀")} Starting User Service...`);

    // ✅ CONECTAR AO BANCO DE DADOS PRIMEIRO
    console.log(`${getTimestamp()} ${chalk.blue("🔍")} Connecting to MongoDB...`);
    
    try {
      await databaseManager.connectDB();
      
      // ⏳ AGUARDAR CONEXÃO ESTAR REALMENTE ATIVA
      const isConnected = await databaseManager.waitForConnection();
      
      if (!isConnected) {
        throw new Error("Não foi possível estabelecer conexão com MongoDB");
      }
      
      const dbStatus = databaseManager.getConnectionStatus();
      console.log(`${getTimestamp()} ${chalk.green("✅")} MongoDB connected successfully`);
      console.log(`${getTimestamp()} ${chalk.gray("📊")} Database: ${dbStatus.database} | Status: ${dbStatus.readyStateDescription}`);
      
    } catch (error) {
      console.error(`${getTimestamp()} ${chalk.red("❌")} Database connection failed:`, error);
      console.log(`${getTimestamp()} ${chalk.yellow("⚠️")} Service starting without database connection`);
    }

    // ✅ INICIAR SERVIDOR HTTP
    server = app.listen(PORT, () => {
      const dbStatus = databaseManager.getConnectionStatus();
      
      console.log(`${getTimestamp()} ${chalk.green("✅")} User Service running on port ${PORT}`);
      console.log(`${getTimestamp()} ${chalk.blue("🌐")} URL: http://localhost:${PORT}`);
      console.log(`${getTimestamp()} ${chalk.blue("⚡")} Environment: ${NODE_ENV}`);
      console.log(`${getTimestamp()} ${chalk.blue("🗄️")} Database: ${dbStatus.database} - ${
        dbStatus.isConnected ? chalk.green('CONNECTED') : chalk.red('DISCONNECTED')
      }`);
    });

    // 🛑 CONFIGURAÇÃO DE GRACEFUL SHUTDOWN
    setupGracefulShutdown();

  } catch (error) {
    console.error(`${getTimestamp()} ${chalk.red("❌")} Error starting server:`, error);
    process.exit(1);
  }
};

/**
 * Configura graceful shutdown para o servidor
 */
const setupGracefulShutdown = (): void => {
  const shutdown = async (signal: string) => {
    console.log(`${getTimestamp()} ${chalk.yellow(`🛑 Received ${signal}, shutting down gracefully...`)}`);
    
    if (server) {
      server.close(async () => {
        console.log(`${getTimestamp()} ${chalk.green("✅")} HTTP server closed`);
        
        try {
          await databaseManager.disconnectDB();
          console.log(`${getTimestamp()} ${chalk.green("✅")} Database connections closed`);
        } catch (error) {
          console.error(`${getTimestamp()} ${chalk.red("❌")} Error closing database connections:`, error);
        }
        
        console.log(`${getTimestamp()} ${chalk.green("🎯")} User Service stopped gracefully`);
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error(`${getTimestamp()} ${chalk.red("💥")} Forcing shutdown after timeout`);
        process.exit(1);
      }, 10000);
    } else {
      await databaseManager.disconnectDB();
      process.exit(0);
    }
  };

  // 🎯 EVENT LISTENERS PARA SHUTDOWN
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error(`${getTimestamp()} ${chalk.red("⚠️")} Unhandled Rejection at:`, promise, "reason:", reason);
  });
  
  process.on("uncaughtException", (error) => {
    console.error(`${getTimestamp()} ${chalk.red("💥")} Uncaught Exception:`, error);
    shutdown("UNCAUGHT_EXCEPTION");
  });
};

export const getServerStatus = () => {
  const dbStatus = databaseManager.getConnectionStatus();
  
  return {
    server: {
      port: PORT,
      environment: NODE_ENV,
      status: server ? "running" : "stopped",
      timestamp: new Date().toISOString()
    },
    database: {
      isConnected: dbStatus.isConnected,
      readyState: dbStatus.readyStateDescription,
      database: dbStatus.database,
      connectionAttempts: dbStatus.connectionAttempts
    }
  };
};

// ✅ Iniciar o servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  startServer();
}

export default startServer;