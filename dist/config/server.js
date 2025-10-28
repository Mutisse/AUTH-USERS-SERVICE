"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerStatus = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("../app"));
const chalk_1 = __importDefault(require("chalk"));
const database_1 = __importDefault(require("./database"));
const getTimestamp = () => chalk_1.default.gray(`[${new Date().toISOString()}]`);
const PORT = parseInt(process.env.PORT || "3001");
const NODE_ENV = process.env.NODE_ENV || "development";
let server = null;
const startServer = async () => {
    try {
        console.log(`${getTimestamp()} ${chalk_1.default.blue("🚀")} Starting User Service...`);
        console.log(`${getTimestamp()} ${chalk_1.default.blue("🔍")} Connecting to MongoDB...`);
        try {
            await database_1.default.connectDB();
            const isConnected = await database_1.default.waitForConnection();
            if (!isConnected) {
                throw new Error("Não foi possível estabelecer conexão com MongoDB");
            }
            const dbStatus = database_1.default.getConnectionStatus();
            console.log(`${getTimestamp()} ${chalk_1.default.green("✅")} MongoDB connected successfully`);
            console.log(`${getTimestamp()} ${chalk_1.default.gray("📊")} Database: ${dbStatus.database} | Status: ${dbStatus.readyStateDescription}`);
        }
        catch (error) {
            console.error(`${getTimestamp()} ${chalk_1.default.red("❌")} Database connection failed:`, error);
            console.log(`${getTimestamp()} ${chalk_1.default.yellow("⚠️")} Service starting without database connection`);
        }
        server = app_1.default.listen(PORT, () => {
            const dbStatus = database_1.default.getConnectionStatus();
            console.log(`${getTimestamp()} ${chalk_1.default.green("✅")} User Service running on port ${PORT}`);
            console.log(`${getTimestamp()} ${chalk_1.default.blue("🌐")} URL: http://localhost:${PORT}`);
            console.log(`${getTimestamp()} ${chalk_1.default.blue("⚡")} Environment: ${NODE_ENV}`);
            console.log(`${getTimestamp()} ${chalk_1.default.blue("🗄️")} Database: ${dbStatus.database} - ${dbStatus.isConnected ? chalk_1.default.green('CONNECTED') : chalk_1.default.red('DISCONNECTED')}`);
        });
        setupGracefulShutdown();
    }
    catch (error) {
        console.error(`${getTimestamp()} ${chalk_1.default.red("❌")} Error starting server:`, error);
        process.exit(1);
    }
};
const setupGracefulShutdown = () => {
    const shutdown = async (signal) => {
        console.log(`${getTimestamp()} ${chalk_1.default.yellow(`🛑 Received ${signal}, shutting down gracefully...`)}`);
        if (server) {
            server.close(async () => {
                console.log(`${getTimestamp()} ${chalk_1.default.green("✅")} HTTP server closed`);
                try {
                    await database_1.default.disconnectDB();
                    console.log(`${getTimestamp()} ${chalk_1.default.green("✅")} Database connections closed`);
                }
                catch (error) {
                    console.error(`${getTimestamp()} ${chalk_1.default.red("❌")} Error closing database connections:`, error);
                }
                console.log(`${getTimestamp()} ${chalk_1.default.green("🎯")} User Service stopped gracefully`);
                process.exit(0);
            });
            setTimeout(() => {
                console.error(`${getTimestamp()} ${chalk_1.default.red("💥")} Forcing shutdown after timeout`);
                process.exit(1);
            }, 10000);
        }
        else {
            await database_1.default.disconnectDB();
            process.exit(0);
        }
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("unhandledRejection", (reason, promise) => {
        console.error(`${getTimestamp()} ${chalk_1.default.red("⚠️")} Unhandled Rejection at:`, promise, "reason:", reason);
    });
    process.on("uncaughtException", (error) => {
        console.error(`${getTimestamp()} ${chalk_1.default.red("💥")} Uncaught Exception:`, error);
        shutdown("UNCAUGHT_EXCEPTION");
    });
};
const getServerStatus = () => {
    const dbStatus = database_1.default.getConnectionStatus();
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
exports.getServerStatus = getServerStatus;
if (require.main === module) {
    startServer();
}
exports.default = startServer;
