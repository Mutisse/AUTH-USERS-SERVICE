import { Router } from 'express';
import { ClientController } from '../../../controllers/user/client/Client.controller';
import { 
  authenticate, 
  requireClient, 
  requireAdmin 
} from '../../../middlewares/auth.middleware';

const router = Router();
const clientController = new ClientController();

// 🎯 ROTAS PÚBLICAS - OTP E AUTENTICAÇÃO
router.post('/register', clientController.register);

// 🎯 ROTAS PROTEGIDAS - REQUER AUTENTICAÇÃO E SER CLIENTE
router.get('/profile', authenticate, requireClient, clientController.getProfile);
router.patch('/profile', authenticate, requireClient, clientController.updateProfile);
router.patch('/preferences', authenticate, requireClient, clientController.updatePreferences);

// 🎯 ROTAS PROTEGIDAS - COM PARÂMETROS
router.patch('/:clientId/loyalty-points', authenticate, requireClient, clientController.updateLoyaltyPoints);
router.post('/:clientId/appointments', authenticate, clientController.recordAppointment);

// 🎯 ROTAS DE GERENCIAMENTO (ADMIN) - ✅ CORRIGIDO: requireAdmin importado
router.get('/', authenticate, requireAdmin, clientController.listClients);
router.get('/:clientId', authenticate, requireAdmin, clientController.getClientById);
router.patch('/:clientId/status', authenticate, requireAdmin, clientController.updateClientStatus);

// 🎯 HEALTH CHECK
router.get('/health', (req, res) => {
  res.json({
    service: 'client',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'otp-verification',
      'profile-management',
      'loyalty-points',
      'appointment-tracking'
    ]
  });
});

export default router;