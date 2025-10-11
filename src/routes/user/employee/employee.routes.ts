import { Router } from 'express';
import { EmployeeController } from '../../../controllers/user/employee/Employee.controller';
import { authenticate, requireEmployee, requireAdmin } from '../../../middlewares/auth.middleware';

const router = Router();
const employeeController = new EmployeeController();

// 🎯 ROTAS PÚBLICAS - OTP E AUTENTICAÇÃO
router.post('/request-otp', employeeController.requestOTP);
router.post('/verify-otp', employeeController.verifyOTP);
router.post('/register', employeeController.register);
router.post('/login', employeeController.login);

// 🎯 ROTAS PROTEGIDAS - EMPLOYEES
router.get('/profile', authenticate, requireEmployee, employeeController.getProfile);
router.patch('/profile', authenticate, requireEmployee, employeeController.updateProfile);
router.patch('/schedule/:employeeId', authenticate, requireEmployee, employeeController.updateSchedule);
router.patch('/availability/:employeeId', authenticate, requireEmployee, employeeController.toggleAvailability);

// 🎯 ROTAS PÚBLICAS - LISTAGEM (clientes podem ver employees)
router.get('/list', employeeController.listByRole);
router.get('/available', employeeController.getAvailableEmployees);
router.get('/:employeeId/public', employeeController.getEmployeePublicProfile);

// 🎯 ROTAS DE AVALIAÇÃO (clientes podem avaliar)
router.patch('/:employeeId/rating', authenticate, employeeController.updateRating);

// 🎯 ROTAS DE ADMINISTRAÇÃO
router.get('/', authenticate, requireAdmin, employeeController.getAllEmployees);
router.get('/:employeeId', authenticate, requireAdmin, employeeController.getEmployeeById);
router.patch('/:employeeId/admin', authenticate, requireAdmin, employeeController.updateEmployeeAdmin);
router.delete('/:employeeId', authenticate, requireAdmin, employeeController.deleteEmployee);

// 🎯 HEALTH CHECK
router.get('/health', (req, res) => {
  res.json({
    service: 'employee',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'otp-verification',
      'schedule-management',
      'availability-tracking',
      'rating-system',
      'profile-management'
    ]
  });
});

export default router;