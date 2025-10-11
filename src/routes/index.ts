import { Router } from 'express';
import clientRoutes from './user/client/client.routes';
import employeeRoutes from './user/employee/employee.routes';
import adminRoutes from './user/admin/admin.routes';
import otpRoutes from './otp/otp.routes';
import authRoutes from './auth/auth.routes';
import sessionRoutes from './session/session.routes';

const router = Router();

// 🎯 ROTAS DA API
router.use('/clients', clientRoutes);
router.use('/employees', employeeRoutes);
router.use('/admins', adminRoutes);
router.use('/otp', otpRoutes);
router.use('/auth', authRoutes);
router.use('/api/sessions', sessionRoutes);

// 🎯 ROTA DE HEALTH CHECK GLOBAL
/*router.get('/health', (req, res) => {
  res.json({
    service: 'beautytime-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      clients: '/api/clients',
      employees: '/api/employees',
      admins: '/api/admins',
      otp: '/api/otp',
      auth: '/api/auth'
    },
    features: [
      'user-management',
      'otp-verification',
      'jwt-authentication',
      'role-based-access',
      'email-notifications'
    ]
  });
});*/

// 🎯 ROTA DE INFORMAÇÕES DA API
router.get('/info', (req, res) => {
  res.json({
    name: 'BeautyTime API',
    description: 'Sistema de gestão para salões de beleza',
    version: '1.0.0',
    documentation: '/api/docs',
    support: 'support@beautytime.com',
    uptime: process.uptime()
  });
});

// 🎯 ROTA DE STATUS DO BANCO DE DADOS
router.get('/database-status', async (req, res) => {
  try {
    // TODO: Implementar verificação real do MongoDB
    res.json({
      database: 'connected',
      timestamp: new Date().toISOString(),
      responseTime: '0ms'
    });
  } catch (error) {
    res.status(503).json({
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 ROTA DE HEALTH DA API (que o Gateway procura)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['authentication', 'user-management']
  });
});

// 🎯 ROTA DE TESTE
router.get('/gateway-test', (req, res) => {
  res.json({
    success: true,
    message: '✅ User Service conectado ao Gateway!',
    data: {
      service: 'user-service',
      status: 'connected',
      timestamp: new Date().toISOString()
    }
  });
});


export default router;