import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./middlewares/request-logger.middleware";
import apiRoutes from "./routes/index.routes";
import chalk from "chalk";
import { AppError } from "./utils/AppError";
import databaseManager from "./config/database";
import { handleError, notFoundHandler } from "./middlewares/error.middleware";

const app = express();

// 🎯 CORES PADRONIZADAS
const colors = {
  success: chalk.green,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  gray: chalk.gray,
};

// 1. CONFIGURAÇÃO INICIAL
app.set("trust proxy", process.env.NODE_ENV === "production");

// 2. ✅ MIDDLEWARES ESSENCIAIS - ORDEM CORRIGIDA!
app.use(express.json({ limit: "10mb" })); // ✅ PRIMEIRO - BODY PARSER
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // ✅ SEGUNDO - BODY PARSER
app.use(helmet()); // ✅ TERCEIRO - SEGURANÇA

// 3. ✅ CORS SIMPLIFICADO
const allowedOrigins = [
  "https://gateway-6rov.onrender.com",
  "http://localhost:9000",
  "http://localhost:8080",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-request-id",
      "X-Service-Name",
      "X-Forwarded-For",
      "Accept",
      "Origin",
    ],
  })
);

// 4. ✅ RATE LIMITING
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "development" ? 1000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => ["/health", "/UserService/health", "/"].includes(req.path),
    handler: () => {
      throw new AppError(
        "Muitas requisições. Tente novamente em 15 minutos.",
        429
      );
    },
  })
);

// 5. ✅ CONEXÃO MONGODB
app.use(async (req, res, next) => {
  try {
    await databaseManager.connectDB();
    next();
  } catch (error) {
    console.error(colors.error("🗄️ Erro MongoDB:"), error);
    next(new AppError("Banco de dados indisponível", 503));
  }
});

// 6. ✅ LOGGING
app.use((req, res, next) => {
  const origin = req.headers.origin || "no-origin";
  console.log(
    colors.info(`${req.method} ${req.path}`),
    colors.gray(`Origem: ${origin}`)
  );
  next();
});

app.use(requestLogger);

// 7. ✅ ROTAS PRINCIPAIS
app.use("/UserService", apiRoutes);

// 8. ✅ HEALTH CHECK UNIFICADO
const getHealthData = () => {
  const dbStatus = databaseManager.getConnectionStatus();
  const memory = process.memoryUsage();

  return {
    service: "beautytime-user-service",
    status: dbStatus.isConnected ? "healthy" : "unhealthy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.isConnected,
      host: dbStatus.host,
      database: dbStatus.database,
      readyState: dbStatus.readyStateDescription,
    },
    system: {
      memory: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      environment: process.env.NODE_ENV || "development",
    },
  };
};

app.get(["/", "/health"], (req, res) => {
  const healthData = getHealthData();
  const statusCode = healthData.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// 9. ✅ TRATAMENTO DE ERROS
app.use(notFoundHandler);
app.use(handleError);

export default app;
