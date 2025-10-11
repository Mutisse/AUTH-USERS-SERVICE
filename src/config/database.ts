import mongoose, { ConnectionStates } from "mongoose";
import chalk from "chalk";

// 🎯 CORES PADRONIZADAS COM O GATEWAY
const colors = {
  success: chalk.green,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta,
  gray: chalk.gray,
  cyan: chalk.cyan,
  white:chalk.white
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

  getConnectionStatus(): DatabaseStatus {
    const mongoUri = process.env.MONGODB_URI || "not configured";
    const databaseName = this.extractDatabaseName(mongoUri);

    return {
      isConnected: this.isConnected,
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
      return url.pathname.replace("/", "") || "beautytime-users";
    } catch {
      return "beautytime-users";
    }
  }

  private getReadyStateDescription(readyState: ConnectionStates): string {
    // ✅ CORREÇÃO: Use apenas os valores que sabemos existir
    const states: { [key: number]: string } = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
      // Adicione outros estados se necessário
    };

    return states[readyState] || "unknown";
  }

  async connectDB(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.connectionAttempts++;

      const MONGODB_URI = process.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error("MONGODB_URI não configurada");
      }

      await mongoose.connect(MONGODB_URI);
      this.isConnected = true;

      const dbStatus = this.getConnectionStatus();
      console.log(colors.success("🗄️  ✅ MongoDB conectado - User Service"));
      console.log(colors.white(`   📁 Database: ${dbStatus.database}`));
      console.log(colors.gray(`   🔗 Host: ${dbStatus.host}`));

      mongoose.connection.on("error", (error) => {
        console.error(colors.error("🗄️ ❌ Erro MongoDB:"), error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        console.log(colors.warning("🗄️ ⚠️  MongoDB desconectado"));
        this.isConnected = false;
      });
    } catch (error) {
      console.error(
        colors.error(
          `🗄️ ❌ Falha na conexão MongoDB (tentativa ${this.connectionAttempts}):`
        ),
        error
      );

      if (this.connectionAttempts < this.maxAttempts) {
        console.log(
          colors.warning(`   🔄 Tentando reconectar em 5 segundos...`)
        );
        setTimeout(() => this.connectDB(), 5000);
      } else {
        throw new Error(
          `Não foi possível conectar ao MongoDB após ${this.maxAttempts} tentativas`
        );
      }
    }
  }

  async disconnectDB(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log(colors.info("📦 Conexão MongoDB fechada"));
    }
  }
}

export default new DatabaseManager();
