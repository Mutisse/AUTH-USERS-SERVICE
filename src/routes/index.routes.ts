import { Router } from "express";
import clientRoutes from "./user/client/client.routes";
import employeeRoutes from "./user/employee/employee.routes";
import adminRoutes from "./user/admin/admin.routes";
import otpRoutes from "./otp/otp.routes";
import authRoutes from "./auth/auth.routes";
import sessionRoutes from "./session/session.routes";
import diagnosticRoutes from "./diagnostic.routes";

const router = Router();

// 🎯 HEALTH CHECK UNIFICADO
const getServiceInfo = () => ({
  service: "beautytime-auth-users-service",
  version: "1.0.0",
  description: "Serviço de autenticação e gestão de usuários",
  environment: process.env.NODE_ENV || "development",
  timestamp: new Date().toISOString(),
  status: "running",
});

// 🎯 ROTAS PRINCIPAIS
router.get(["/", "/health"], (req, res) => {
  const isRoot = req.path === "/";

  res.json({
    success: true,
    message: isRoot
      ? "Bem-vindo ao BeautyTime Auth Users Service"
      : "Service healthy",
    data: {
      ...getServiceInfo(),
      endpoints: {
        authentication: [
          "/auth/register",
          "/auth/login",
          "/auth/check-email",
          "/auth/refresh-token",
          "/auth/logout",
        ],
        users: ["/clients", "/employees", "/admins"],
        otp: ["/otp/send", "/otp/verify", "/otp/resend"],
        diagnostic: [
          "/diagnostic/system-analysis",
          "/diagnostic/routes-detailed",
          "/diagnostic/dependencies",
          "/diagnostic/services-status",
        ],
        sessions: ["/sessions"],
      },
    },
  });
});

// 🎯 ROTAS DE API
router.use("/diagnostic", diagnosticRoutes);
router.use("/auth", authRoutes);
router.use("/clients", clientRoutes);
router.use("/employees", employeeRoutes);
router.use("/admins", adminRoutes);
router.use("/otp", otpRoutes);
router.use("/sessions", sessionRoutes);

// 🎯 ROTA DE FALLBACK
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    suggestion: "Consulte /UserService/health para ver rotas disponíveis",
    timestamp: new Date().toISOString(),
  });
});

export default router;
