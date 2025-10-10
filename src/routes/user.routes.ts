import express from "express";
import { UserController } from "../controllers/user.controller";

const router = express.Router();
const userController = new UserController();

// Rotas públicas
router.post("/register", userController.createUser.bind(userController));
router.post("/verify-credentials", userController.verifyCredentials.bind(userController));
router.post("/login", userController.login.bind(userController));
router.post("/verify-email", userController.verifyEmail.bind(userController));

// Rotas protegidas
router.get("/profile", userController.getProfile.bind(userController));
router.put("/:id", userController.updateUser.bind(userController));
router.put("/:id/preferences", userController.updatePreferences.bind(userController));

// Nova rota para status online
router.patch("/:userId/status", userController.updateStatus.bind(userController));
router.patch('/:userId/activity',userController.updateUserActivity);
export default router;
