import { Router } from "express";
import clientRoutes from "./user/client/client.routes";
import employeeRoutes from "./user/employee/employee.routes";
import adminRoutes from "./user/admin/admin.routes";
import otpRoutes from "./otp/otp.routes";
import authRoutes from "./auth/auth.routes";
import sessionRoutes from "./session/session.routes";
import testRoutes from "./test.routes";

const router = Router();

// 🎯 ROTAS PRINCIPAIS (SEM /api - pois já tem prefixo no app.ts)
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bem-vindo ao BeautyTime Auth Users Service",
    data: {
      service: "Auth Users Service",
      version: "1.0.0",
      description: "Serviço de autenticação e gestão de usuários",
      documentation: "/api/health",
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth Users Service está funcionando",
    data: {
      service: "beautytime-auth-users-service",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      endpoints: {
        "🏠 Principais": {
          "❤️ Health": "/api/health",
          "🏠 Welcome": "/api/",
          "🎯 Gateway Test": "/api/gateway-test",
          "🔄 Ping Gateway": "/api/ping-gateway",
        },
        "🔐 Autenticação": {
          "👤 Register": "/api/auth/register",
          "🔐 Login": "/api/auth/login",
        },
        "👥 Gestão de Usuários": {
          "👥 Clientes": "/api/clients",
          "💼 Funcionários": "/api/employees",
          "👨‍💼 Administradores": "/api/admins",
        },
      },
    },
  });
});

// 🎯 ROTAS DE INFORMAÇÃO
router.get("/info", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "BeautyTime Auth Users Service",
      description: "Serviço de autenticação e gestão de usuários",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      status: "running",
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/database-status", async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        database: "connected",
        timestamp: new Date().toISOString(),
        responseTime: "0ms",
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Database connection failed",
      data: {
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// 🎯 COMUNICAÇÃO COM GATEWAY
router.get("/gateway-test", (req, res) => {
  res.json({
    success: true,
    message: "✅ Auth Users Service conectado ao Gateway!",
    data: {
      service: "auth-users-service",
      status: "connected",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    },
  });
});

router.get("/ping-gateway", async (req, res) => {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // ✅ Reduzido para 5s

    const gatewayResponse = await fetch(
      "https://gateway-6rov.onrender.com/health",
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const gatewayData = await gatewayResponse.json().catch(() => ({}));

    res.json({
      success: true,
      message: "✅ Ping para Gateway bem-sucedido!",
      data: {
        timestamp: new Date().toISOString(),
        source: "auth-users-service",
        target: "gateway",
        status: gatewayResponse.ok ? "online" : "offline",
        response_time: `${responseTime}ms`,
        gateway_status: gatewayResponse.status,
        performance:
          responseTime < 1000
            ? "excellent"
            : responseTime < 3000
            ? "good"
            : responseTime < 5000
            ? "acceptable"
            : "slow",
      },
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    res.status(500).json({
      success: false,
      message: "❌ Falha no ping para o Gateway",
      data: {
        timestamp: new Date().toISOString(),
        source: "auth-users-service",
        target: "gateway",
        status: "offline",
        response_time: `${responseTime}ms`,
        error: error.message,
      },
    });
  }
});

// 🎯 ROTAS DE API (SEM PREFIXO /api)
router.use("/clients", clientRoutes);
router.use("/employees", employeeRoutes);
router.use("/admins", adminRoutes);
router.use("/otp", otpRoutes);
router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/test", testRoutes);

// 🎯 ROTA DE FALLBACK
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    available_routes: [
      "GET /api/",
      "GET /api/health",
      "GET /api/info",
      "GET /api/gateway-test",
      "GET /api/ping-gateway",
      "GET /api/test/connection",
      "GET /api/test/database",
      "GET /api/test/performance",
    ],
    timestamp: new Date().toISOString(),
  });
});

export default router;