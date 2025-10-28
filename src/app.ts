import express from "express";
import cors from "cors";
import chalk from "chalk";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import userServiceRoutes from "./routes/all-user.routes";

dotenv.config();

const app = express();

// 🕐 Utilitário de timestamp
const getTimestamp = () => chalk.gray(`[${new Date().toISOString()}]`);

// =============================================
// 🎯 ORDEM CORRETA - ATUALIZADA
// =============================================

// ✅ 1. CORS PRIMEIRO
app.use(cors());

// ✅ 2. SEGURANÇA
app.use(helmet());

// ✅ 3. BODY-PARSER (CRÍTICO - DEVE VIR ANTES DO LOGGING)
app.use(
  bodyParser.json({
    limit: "10mb",
    strict: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ✅ 4. RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ 5. MIDDLEWARE DE DEBUG (CORRIGIDO - SEGURO)
app.use((req, res, next) => {
  console.log("🔍 [USER SERVICE DEBUG] Body parsing check:");
  console.log("🔍 Body type:", typeof req.body);
  
  // ✅ CORREÇÃO: Verificar se req.body existe antes de usar Object.keys
  if (req.body && typeof req.body === 'object' && req.body !== null) {
    console.log("🔍 Body keys:", Object.keys(req.body));
    console.log("🔍 Body content:", JSON.stringify(req.body).substring(0, 300));
  } else {
    console.log("🔍 Body keys: []");
    console.log("🔍 Body content: {}");
  }
  
  console.log("🔍 Content-Type:", req.headers["content-type"]);
  next();
});

// ✅ 6. LOGGER MELHORADO (AGORA COM BODY DISPONÍVEL)
app.use((req, res, next) => {
  const start = Date.now();

  // Log básico da requisição
  console.log(getTimestamp(), chalk.cyan("⬅️"), req.method, req.path);

  // ✅ AGORA O BODY ESTÁ DISPONÍVEL AQUI!
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    // Criar uma cópia do body para logging
    const bodyCopy = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    
    // 🔒 Mascarar dados sensíveis
    if (bodyCopy.password) {
      bodyCopy.password = "********";
    }
    if (bodyCopy.newPassword) {
      bodyCopy.newPassword = "********";
    }
    if (bodyCopy.confirmPassword) {
      bodyCopy.confirmPassword = "********";
    }
    if (bodyCopy.otpCode) {
      bodyCopy.otpCode = "******";
    }

    console.log(
      getTimestamp(),
      chalk.yellow("📦 CORPO DA REQUISIÇÃO:"),
      JSON.stringify(bodyCopy, null, 2)
    );
  } else {
    console.log(getTimestamp(), chalk.gray("📦 CORPO DA REQUISIÇÃO:"), "{}");
  }

  // ✅ IMPRIMIR QUERY PARAMETERS SE EXISTIREM
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(
      getTimestamp(),
      chalk.blue("🔍 QUERY PARAMS:"),
      JSON.stringify(req.query, null, 2)
    );
  }

  // ✅ IMPRIMIR HEADERS RELEVANTES (com segurança)
  const relevantHeaders = {
    "content-type": req.headers["content-type"],
    "user-agent": req.headers["user-agent"],
    "x-forwarded-for": req.headers["x-forwarded-for"],
    "x-service-source": req.headers["x-service-source"] || "gateway",
  };

  console.log(
    getTimestamp(),
    chalk.magenta("📋 HEADERS:"),
    JSON.stringify(relevantHeaders, null, 2)
  );

  // Capturar a resposta para logging
  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody: any;

  res.send = function (body: any): any {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.json = function (body: any): any {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusIcon = res.statusCode >= 400 ? "❌" : "✅";
    const statusColor = res.statusCode >= 400 ? chalk.red : chalk.green;

    console.log(
      getTimestamp(),
      statusColor(statusIcon),
      req.method,
      req.path,
      res.statusCode,
      chalk.magenta(`${duration}ms`)
    );

    // ✅ IMPRIMIR RESPOSTA (se não for muito grande)
    if (responseBody && duration > 50) {
      try {
        const responseStr =
          typeof responseBody === "string"
            ? responseBody
            : JSON.stringify(responseBody);

        if (responseStr.length < 500) {
          console.log(getTimestamp(), chalk.green("📤 RESPOSTA:"), responseStr);
        } else {
          console.log(
            getTimestamp(),
            chalk.green("📤 RESPOSTA:"),
            responseStr.substring(0, 200) + "..."
          );
        }
      } catch (e) {
        console.log(
          getTimestamp(),
          chalk.green("📤 RESPOSTA:"),
          "[NÃO PODE SER SERIALIZADO]"
        );
      }
    }

    // ✅ LOG ESPECIAL PARA REQUISIÇÕES LENTAS
    if (duration > 1000) {
      console.log(
        getTimestamp(),
        chalk.red("🐌 REQUISIÇÃO LENTA:"),
        `${duration}ms`
      );
    }
  });

  next();
});

// ✅ 7. MIDDLEWARE DE ROTA
app.use((req, res, next) => {
  console.log(`📍 [USER SERVICE ROUTE] ${req.method} ${req.path}`);
  next();
});

// ✅ 8. ROTAS (ÚLTIMO)
app.use(userServiceRoutes);

// =============================================
// 🏠 ROTAS DO USER SERVICE
// =============================================

// ✅ HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "User Service",
    timestamp: new Date().toISOString(),
    version: "2.2.0",
    body_parsing: "FIXED", // 🆕 NOVO
  });
});

// ✅ ROTA RAIZ
app.get("/", (req, res) => {
  res.json({
    message: "👥 User Service",
    status: "running",
    timestamp: new Date().toISOString(),
    version: "2.2.0",
    body_parsing: "CORRECT_ORDER", // 🆕 NOVO
  });
});

// ✅ 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Endpoint não encontrado",
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

export default app;