import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./middlewares/request-logger.middleware";
import apiRoutes from "./routes/index";
import chalk from "chalk";
import { AppError } from "./utils/AppError";
import databaseManager from "./config/database";
import { handleError, notFoundHandler } from './middlewares/error.middleware';
// No final do arquivo, ANTES de app.listen:

const app = express();

// 🎯 CORES PADRONIZADAS COM O GATEWAY
const colors = {
  success: chalk.green,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta,
  gray: chalk.gray,
  cyan: chalk.cyan,
};

// 1. Configuração de proxy
app.set("trust proxy", process.env.NODE_ENV === "production");

// 2. Middlewares essenciais
app.use(helmet());
app.use(express.json({ limit: "10mb" }));

// 3. ✅ CORS APENAS PARA GATEWAY
const allowedOrigins = [
  "http://localhost:8080", // Gateway
  "http://localhost:9000", // Frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.log(
        colors.error(`🚫 User Service: Origem bloqueada - ${origin}`)
      );
      callback(new AppError("Acesso permitido apenas através do gateway", 403));
    },
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
    exposedHeaders: ["Authorization", "X-Refresh-Token"],
  })
);

// 4. ✅ RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/api/health",
  handler: (req, res) => {
    throw new AppError(
      "Muitas requisições. Tente novamente em 15 minutos.",
      429
    );
  },
});
app.use(limiter);

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

// 6. ✅ LOGGING MELHORADO
app.use((req, res, next) => {
  const origin = req.headers.origin || "no-origin";
  console.log(
    colors.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`),
    colors.gray(`Origem: ${origin}`)
  );
  next();
});

app.use(requestLogger);

// 7. ✅ ROTAS DA API
app.use("/api", apiRoutes);

// 8. ✅ HEALTH CHECK RAIZ
app.get("/", (req, res) => {
  const dbStatus = databaseManager.getConnectionStatus();

  res.json({
    service: "beautytime-user-service",
    status: "running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.isConnected ? "connected" : "disconnected",
      host: dbStatus.host,
      database: dbStatus.database,
    },
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      users: "/api/users",
    },
  });
});

app.get("/health", (req, res) => {
  const dbStatus = databaseManager.getConnectionStatus();

  res.json({
    status: "healthy",
    service: "user-service",
    database: {
      connected: dbStatus.isConnected,
      readyState: dbStatus.readyStateDescription,
      host: dbStatus.host,
      database: dbStatus.database,
    },
    memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// 9. ✅ TRATAMENTO DE ERROS
app.use(notFoundHandler);
app.use(handleError);
export default app;
