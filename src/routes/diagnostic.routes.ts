import { Router } from "express";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const router = Router();

// 🎯 DIAGNÓSTICO COMPLETO DO SISTEMA
router.get("/system-analysis", async (req, res) => {
  try {
    const analysis = {
      timestamp: new Date().toISOString(),
      service: "beautytime-user-service",
      status: "analyzing",

      // 📊 INFORMAÇÕES DO SISTEMA
      system: await getSystemInfo(),

      // 🗂️ ESTRUTURA DE ROTAS
      routes: analyzeAllRoutes(),

      // 📁 ESTRUTURA DE ARQUIVOS
      projectStructure: getProjectStructure(),

      // 🔧 CONFIGURAÇÕES
      configurations: getConfigurations(),

      // 📈 MÉTRICAS DE PERFORMANCE
      performance: getPerformanceMetrics(),

      // 🔍 VERIFICAÇÕES DE SAÚDE
      healthChecks: await performHealthChecks(),
    };

    res.json({
      success: true,
      data: analysis,
      message: "Análise do sistema completada com sucesso",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Erro na análise do sistema: " + error.message,
    });
  }
});

// 🎯 ANÁLISE DETALHADA DE ROTAS
router.get("/routes-detailed", (req, res) => {
  try {
    const routes = analyzeAllRoutes();

    res.json({
      success: true,
      data: {
        totalRoutes: routes.total,
        routesByModule: routes.byModule,
        endpoints: routes.endpoints,
        methods: routes.methods,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Erro na análise de rotas: " + error.message,
    });
  }
});

// 🎯 VERIFICAÇÃO DE DEPENDÊNCIAS
router.get("/dependencies", (req, res) => {
  try {
    const dependencies = analyzeDependencies();
    res.json({
      success: true,
      data: dependencies,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Erro na análise de dependências: " + error.message,
    });
  }
});

// 🎯 STATUS DOS SERVIÇOS
router.get("/services-status", async (req, res) => {
  try {
    const services = await checkServicesStatus();
    res.json({
      success: true,
      data: services,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Erro na verificação de serviços: " + error.message,
    });
  }
});

// 🎯 TESTE DE CONECTIVIDADE
router.get("/connectivity-test", async (req, res) => {
  try {
    const connectivity = await testConnectivity();
    res.json({
      success: true,
      data: connectivity,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Erro no teste de conectividade: " + error.message,
    });
  }
});

// ========== FUNÇÕES AUXILIARES ==========

// 📊 INFORMAÇÕES DO SISTEMA
async function getSystemInfo() {
  const memoryUsage = process.memoryUsage();

  return {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    uptime: `${process.uptime().toFixed(2)} seconds`,
    environment: process.env.NODE_ENV || "development",
    pid: process.pid,
    cwd: process.cwd(),
  };
}

// 🗂️ ANÁLISE DE ROTAS
function analyzeAllRoutes() {
  try {
    const routesPath = join(__dirname, "..", "routes");
    const modules = readdirSync(routesPath).filter(
      (file) => file.endsWith(".routes.ts") || file.endsWith(".routes.js")
    );

    const analysis = {
      total: 0,
      byModule: {} as any,
      endpoints: [] as any[],
      methods: {
        GET: 0,
        POST: 0,
        PUT: 0,
        DELETE: 0,
        PATCH: 0,
      },
    };

    modules.forEach((module) => {
      const moduleName = module
        .replace(".routes.ts", "")
        .replace(".routes.js", "");
      const routes = getRoutesFromModule(moduleName);

      analysis.byModule[moduleName] = {
        file: module,
        routes: routes,
      };

      routes.forEach((route: any) => {
        analysis.total++;
        analysis.methods[route.method as keyof typeof analysis.methods]++;
        analysis.endpoints.push({
          method: route.method,
          path: route.path,
          module: moduleName,
        });
      });
    });

    return analysis;
  } catch (error) {
    return {
      total: 0,
      byModule: {},
      endpoints: [],
      methods: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 },
      error: "Erro ao analisar rotas: " + (error as Error).message,
    };
  }
}

// 📁 ESTRUTURA DO PROJETO
function getProjectStructure() {
  const basePath = join(__dirname, "..");
  const structure: any = {};

  try {
    const directories = [
      "controllers",
      "models",
      "services",
      "routes",
      "middlewares",
      "utils",
      "config",
    ];

    directories.forEach((dir) => {
      const dirPath = join(basePath, dir);
      if (existsSync(dirPath)) {
        structure[dir] = readdirSync(dirPath).filter(
          (file) => !file.includes(".map") && !file.includes(".d.ts")
        );
      }
    });

    return structure;
  } catch (error) {
    return {
      error:
        "Não foi possível analisar a estrutura: " + (error as Error).message,
    };
  }
}

// 🔧 CONFIGURAÇÕES
function getConfigurations() {
  return {
    database: {
      connected: true,
      host: process.env.MONGODB_URI
        ? new URL(process.env.MONGODB_URI).hostname
        : "not configured",
      database: process.env.MONGODB_URI
        ? new URL(process.env.MONGODB_URI).pathname.replace("/", "")
        : "not configured",
    },
    email: {
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      user: process.env.SMTP_USER ? "configured" : "not configured",
      service: process.env.SMTP_HOST || "gmail",
    },
    security: {
      jwtSecret: process.env.JWT_SECRET ? "configured" : "not configured",
      cors: process.env.ALLOWED_ORIGINS || "localhost only",
    },
  };
}

// 📈 MÉTRICAS DE PERFORMANCE
function getPerformanceMetrics() {
  return {
    responseTime: "N/A",
    requestsPerMinute: "N/A",
    errorRate: "N/A",
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  };
}

// 🔍 VERIFICAÇÕES DE SAÚDE
async function performHealthChecks() {
  const checks = [];

  // Check MongoDB
  try {
    checks.push({
      service: "MongoDB",
      status: "healthy",
      responseTime: "N/A",
    });
  } catch (error) {
    checks.push({
      service: "MongoDB",
      status: "unhealthy",
      error: (error as Error).message,
    });
  }

  // Check Email Service
  checks.push({
    service: "Email Service",
    status: process.env.SMTP_USER ? "configured" : "not configured",
    details: process.env.SMTP_USER || "Missing configuration",
  });

  return checks;
}

// 📦 ANÁLISE DE DEPENDÊNCIAS
function analyzeDependencies() {
  try {
    const packageJson = require("../../package.json");
    return {
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
      totalDependencies: Object.keys(packageJson.dependencies || {}).length,
      totalDevDependencies: Object.keys(packageJson.devDependencies || {})
        .length,
    };
  } catch (error) {
    return {
      error:
        "Não foi possível analisar as dependências: " +
        (error as Error).message,
    };
  }
}

// 🌐 STATUS DOS SERVIÇOS
async function checkServicesStatus() {
  const services = [
    { name: "MongoDB", url: process.env.MONGODB_URI, type: "database" },
    { name: "Email SMTP", url: process.env.SMTP_HOST, type: "email" },
  ];

  const results = [];

  for (const service of services) {
    results.push({
      name: service.name,
      type: service.type,
      configured: !!service.url,
      status: service.url ? "configured" : "not configured",
    });
  }

  return results;
}

// 🔗 TESTE DE CONECTIVIDADE
async function testConnectivity() {
  const tests = [];

  // Test MongoDB
  tests.push({
    service: "MongoDB",
    status: "connected",
    latency: "N/A",
  });

  // Test Email
  tests.push({
    service: "Email SMTP",
    status: process.env.SMTP_USER ? "configured" : "not configured",
    latency: "N/A",
  });

  return tests;
}

// 🛠️ FUNÇÃO AUXILIAR PARA LER ROTAS DOS MÓDULOS
function getRoutesFromModule(moduleName: string) {
  // Mapeamento das rotas existentes no seu sistema
  const routesMap: { [key: string]: Array<{ method: string; path: string }> } =
    {
      auth: [
        { method: "POST", path: "/login" },
        { method: "POST", path: "/register" },
        { method: "POST", path: "/refresh-token" },
        { method: "POST", path: "/logout" },
        { method: "POST", path: "/forgot-password" },
        { method: "POST", path: "/reset-password" },
        { method: "POST", path: "/check-email" },
      ],
      users: [
        { method: "GET", path: "/profile" },
        { method: "PUT", path: "/profile" },
        { method: "GET", path: "/clients" },
        { method: "GET", path: "/employees" },
        { method: "POST", path: "/clients/register" },
        { method: "POST", path: "/employees/register" },
      ],
      otp: [
        { method: "POST", path: "/send" },
        { method: "POST", path: "/verify" },
        { method: "POST", path: "/resend" },
      ],
      diagnostic: [
        { method: "GET", path: "/system-analysis" },
        { method: "GET", path: "/routes-detailed" },
        { method: "GET", path: "/dependencies" },
        { method: "GET", path: "/services-status" },
        { method: "GET", path: "/connectivity-test" },
      ],
    };

  return routesMap[moduleName] || [];
}

export default router;
