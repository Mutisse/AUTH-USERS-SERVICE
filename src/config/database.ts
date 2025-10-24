// src/config/database.ts
import mongoose, { ConnectionStates } from "mongoose";
import chalk from "chalk";

const colors = {
  success: chalk.green,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta,
  gray: chalk.gray,
  cyan: chalk.cyan,
  white: chalk.white
};

interface DatabaseStatus {
  isConnected: boolean;
  readyState: ConnectionStates;
  readyStateDescription: string;
  host: string;
  database: string;
  connectionAttempts: number;
}

class DatabaseManager {
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxAttempts: number = 3;
  private connectionTimeout: NodeJS.Timeout | null = null;

  getConnectionStatus(): DatabaseStatus {
    const mongoUri = process.env.MONGODB_URI || "not configured";
    const databaseName = this.extractDatabaseName(mongoUri);

    return {
      isConnected: this.isConnected && mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      readyStateDescription: this.getReadyStateDescription(
        mongoose.connection.readyState
      ),
      host: mongoUri,
      database: databaseName,
      connectionAttempts: this.connectionAttempts,
    };
  }

  private extractDatabaseName(mongoUri: string): string {
    try {
      const url = new URL(mongoUri);
      const dbName = url.pathname.replace("/", "") || "usersdb";
      return dbName.split('?')[0];
    } catch {
      return "usersdb";
    }
  }

  private getReadyStateDescription(readyState: ConnectionStates): string {
    const states: { [key: number]: string } = {
      0: "disconnected",
      1: "connected", 
      2: "connecting",
      3: "disconnecting",
    };
    return states[readyState] || "unknown";
  }

  async connectDB(): Promise<void> {
    // 🔄 Se já está conectando ou conectado, não faz nada
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      console.log(colors.info("🔄 Conexão MongoDB já em andamento..."));
      return;
    }

    try {
      this.connectionAttempts++;

      const MONGODB_URI = process.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error("MONGODB_URI não configurada no .env");
      }

      const databaseName = this.extractDatabaseName(MONGODB_URI);
      
      console.log(colors.info(`🔌 Tentando conectar ao MongoDB... (Tentativa ${this.connectionAttempts})`));
      console.log(colors.gray(`   📊 Database: ${databaseName}`));

      // ⚡ CONFIGURAÇÕES CORRIGIDAS - sem bufferMaxEntries
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,    // 15 segundos para selecionar servidor
        socketTimeoutMS: 45000,             // 45 segundos para operações
        connectTimeoutMS: 30000,            // 30 segundos para conexão inicial
        bufferCommands: false,              // Não bufferizar comandos
        maxPoolSize: 10,                    // Pool de conexões
        minPoolSize: 5,                     // Pool mínimo
        maxIdleTimeMS: 30000,               // Tempo máximo ocioso
        retryWrites: true,                  // Retry writes
        retryReads: true,                   // Retry reads
        family: 4,                          // Usar IPv4
      });

      // ✅ CONEXÃO ESTABELECIDA
      this.isConnected = true;
      this.connectionAttempts = 0; // Resetar tentativas

      const dbStatus = this.getConnectionStatus();
      console.log(colors.success("✅ MongoDB CONECTADO COM SUCESSO - User Service"));
      console.log(colors.white(`   📊 Database: ${dbStatus.database}`));
      console.log(colors.white(`   🔗 Estado: ${dbStatus.readyStateDescription}`));

      // 🎯 EVENT LISTENERS MELHORADOS
      mongoose.connection.on("error", (error) => {
        console.error(colors.error("❌ Erro na conexão MongoDB:"), error);
        this.isConnected = false;
        this.handleReconnection();
      });

      mongoose.connection.on("disconnected", () => {
        console.log(colors.warning("⚠️ MongoDB desconectado"));
        this.isConnected = false;
        this.handleReconnection();
      });

      mongoose.connection.on("connected", () => {
        console.log(colors.success("🔗 MongoDB reconectado"));
        this.isConnected = true;
      });

      mongoose.connection.on("reconnected", () => {
        console.log(colors.success("🔄 MongoDB reconectado após falha"));
        this.isConnected = true;
      });

    } catch (error) {
      console.error(
        colors.error(
          `❌ Falha na conexão MongoDB (tentativa ${this.connectionAttempts}):`
        ),
        error
      );

      if (this.connectionAttempts < this.maxAttempts) {
        console.log(colors.warning(`   🔄 Tentando reconectar em 5 segundos...`));
        this.handleReconnection();
      } else {
        console.error(colors.error(`   💥 Máximo de tentativas (${this.maxAttempts}) atingido`));
        throw new Error(
          `Não foi possível conectar ao MongoDB após ${this.maxAttempts} tentativas`
        );
      }
    }
  }

  private handleReconnection(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    this.connectionTimeout = setTimeout(() => {
      if (mongoose.connection.readyState !== 1) {
        this.connectDB();
      }
    }, 5000);
  }

  async waitForConnection(): Promise<boolean> {
    const maxWaitTime = 10000; // 10 segundos
    const startTime = Date.now();

    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - startTime > maxWaitTime) {
        console.error(colors.error("⏰ Timeout aguardando conexão MongoDB"));
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return true;
  }

  async disconnectDB(): Promise<void> {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log(colors.info("🔌 Conexão MongoDB fechada"));
    }
  }

  // ✅ Novo método para verificação rápida
  isDatabaseConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  // ✅ Método para health check
  async healthCheck(): Promise<{ status: string; database: string; ping: boolean }> {
    try {
      if (!this.isDatabaseConnected()) {
        return { status: "disconnected", database: this.extractDatabaseName(process.env.MONGODB_URI || ""), ping: false };
      }

      // Testar ping no banco
      await mongoose.connection.db.admin().ping();
      return { status: "connected", database: this.extractDatabaseName(process.env.MONGODB_URI || ""), ping: true };
    } catch (error) {
      return { status: "error", database: this.extractDatabaseName(process.env.MONGODB_URI || ""), ping: false };
    }
  }
}

export default new DatabaseManager();