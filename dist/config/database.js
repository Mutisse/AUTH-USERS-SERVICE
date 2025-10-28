"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const chalk_1 = __importDefault(require("chalk"));
const colors = {
    success: chalk_1.default.green,
    info: chalk_1.default.blue,
    warning: chalk_1.default.yellow,
    error: chalk_1.default.red,
    debug: chalk_1.default.magenta,
    gray: chalk_1.default.gray,
    cyan: chalk_1.default.cyan,
    white: chalk_1.default.white
};
class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxAttempts = 3;
        this.connectionTimeout = null;
    }
    getConnectionStatus() {
        const mongoUri = process.env.MONGODB_URI || "not configured";
        const databaseName = this.extractDatabaseName(mongoUri);
        return {
            isConnected: this.isConnected && mongoose_1.default.connection.readyState === 1,
            readyState: mongoose_1.default.connection.readyState,
            readyStateDescription: this.getReadyStateDescription(mongoose_1.default.connection.readyState),
            host: mongoUri,
            database: databaseName,
            connectionAttempts: this.connectionAttempts,
        };
    }
    extractDatabaseName(mongoUri) {
        try {
            const url = new URL(mongoUri);
            const dbName = url.pathname.replace("/", "") || "usersdb";
            return dbName.split('?')[0];
        }
        catch {
            return "usersdb";
        }
    }
    getReadyStateDescription(readyState) {
        const states = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting",
        };
        return states[readyState] || "unknown";
    }
    async connectDB() {
        if (mongoose_1.default.connection.readyState === 1 || mongoose_1.default.connection.readyState === 2) {
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
            await mongoose_1.default.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 15000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 30000,
                bufferCommands: false,
                maxPoolSize: 10,
                minPoolSize: 5,
                maxIdleTimeMS: 30000,
                retryWrites: true,
                retryReads: true,
                family: 4,
            });
            this.isConnected = true;
            this.connectionAttempts = 0;
            const dbStatus = this.getConnectionStatus();
            console.log(colors.success("✅ MongoDB CONECTADO COM SUCESSO - User Service"));
            console.log(colors.white(`   📊 Database: ${dbStatus.database}`));
            console.log(colors.white(`   🔗 Estado: ${dbStatus.readyStateDescription}`));
            mongoose_1.default.connection.on("error", (error) => {
                console.error(colors.error("❌ Erro na conexão MongoDB:"), error);
                this.isConnected = false;
                this.handleReconnection();
            });
            mongoose_1.default.connection.on("disconnected", () => {
                console.log(colors.warning("⚠️ MongoDB desconectado"));
                this.isConnected = false;
                this.handleReconnection();
            });
            mongoose_1.default.connection.on("connected", () => {
                console.log(colors.success("🔗 MongoDB reconectado"));
                this.isConnected = true;
            });
            mongoose_1.default.connection.on("reconnected", () => {
                console.log(colors.success("🔄 MongoDB reconectado após falha"));
                this.isConnected = true;
            });
        }
        catch (error) {
            console.error(colors.error(`❌ Falha na conexão MongoDB (tentativa ${this.connectionAttempts}):`), error);
            if (this.connectionAttempts < this.maxAttempts) {
                console.log(colors.warning(`   🔄 Tentando reconectar em 5 segundos...`));
                this.handleReconnection();
            }
            else {
                console.error(colors.error(`   💥 Máximo de tentativas (${this.maxAttempts}) atingido`));
                throw new Error(`Não foi possível conectar ao MongoDB após ${this.maxAttempts} tentativas`);
            }
        }
    }
    handleReconnection() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        this.connectionTimeout = setTimeout(() => {
            if (mongoose_1.default.connection.readyState !== 1) {
                this.connectDB();
            }
        }, 5000);
    }
    async waitForConnection() {
        const maxWaitTime = 10000;
        const startTime = Date.now();
        while (mongoose_1.default.connection.readyState !== 1) {
            if (Date.now() - startTime > maxWaitTime) {
                console.error(colors.error("⏰ Timeout aguardando conexão MongoDB"));
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return true;
    }
    async disconnectDB() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        if (mongoose_1.default.connection.readyState !== 0) {
            await mongoose_1.default.disconnect();
            this.isConnected = false;
            console.log(colors.info("🔌 Conexão MongoDB fechada"));
        }
    }
    isDatabaseConnected() {
        return this.isConnected && mongoose_1.default.connection.readyState === 1;
    }
    async healthCheck() {
        try {
            if (!this.isDatabaseConnected()) {
                return { status: "disconnected", database: this.extractDatabaseName(process.env.MONGODB_URI || ""), ping: false };
            }
            await mongoose_1.default.connection.db.admin().ping();
            return { status: "connected", database: this.extractDatabaseName(process.env.MONGODB_URI || ""), ping: true };
        }
        catch (error) {
            return { status: "error", database: this.extractDatabaseName(process.env.MONGODB_URI || ""), ping: false };
        }
    }
}
exports.default = new DatabaseManager();
