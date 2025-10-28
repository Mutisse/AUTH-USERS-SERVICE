"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationCleanupUtil = void 0;
class RegistrationCleanupUtil {
    constructor(userModel) {
        this.userModel = userModel;
        this.cleanupInterval = null;
    }
    async cleanupExpiredRegistrations() {
        try {
            const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = await this.userModel.deleteMany({
                status: 'PENDING_VERIFICATION',
                createdAt: { $lt: expirationTime }
            });
            console.log(`🗑️ Limpos ${result.deletedCount} registros expirados`);
            return {
                deletedCount: result.deletedCount,
                success: true
            };
        }
        catch (error) {
            console.error('❌ Erro na limpeza de registros:', error);
            return {
                deletedCount: 0,
                success: false
            };
        }
    }
    startScheduledCleanup() {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(2, 0, 0, 0);
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        const timeUntilTarget = targetTime.getTime() - now.getTime();
        setTimeout(() => {
            this.executeCleanup();
            this.cleanupInterval = setInterval(() => {
                this.executeCleanup();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilTarget);
        console.log('✅ Agendador de limpeza iniciado (diário às 2 AM)');
    }
    async executeCleanup() {
        try {
            const result = await this.cleanupExpiredRegistrations();
            if (result.success) {
                console.log(`✅ Limpeza automática concluída: ${result.deletedCount} registros`);
            }
            else {
                console.log('❌ Falha na limpeza automática');
            }
        }
        catch (error) {
            console.error('❌ Erro no agendamento de limpeza:', error);
        }
    }
    stopScheduledCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Agendador de limpeza parado');
        }
    }
    async manualCleanup() {
        return await this.cleanupExpiredRegistrations();
    }
}
exports.RegistrationCleanupUtil = RegistrationCleanupUtil;
