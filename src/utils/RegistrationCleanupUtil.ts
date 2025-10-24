import { Model } from "mongoose";

export class RegistrationCleanupUtil {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private userModel: Model<any>) {}

  async cleanupExpiredRegistrations(): Promise<{
    deletedCount: number;
    success: boolean;
  }> {
    try {
      const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
      
      const result = await this.userModel.deleteMany({
        status: 'PENDING_VERIFICATION',
        createdAt: { $lt: expirationTime }
      });
      
      console.log(`🗑️ Limpos ${result.deletedCount} registros expirados`);
      
      return {
        deletedCount: result.deletedCount,
        success: true
      };
    } catch (error) {
      console.error('❌ Erro na limpeza de registros:', error);
      return {
        deletedCount: 0,
        success: false
      };
    }
  }

  startScheduledCleanup(): void {
    // Calcular tempo até às 2 AM
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(2, 0, 0, 0);
    
    // Se já passou das 2 AM, agendar para amanhã
    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const timeUntilTarget = targetTime.getTime() - now.getTime();

    // Agendar primeira execução para às 2 AM
    setTimeout(() => {
      this.executeCleanup(); // Executar imediatamente às 2 AM
      
      // Agendar execuções diárias a cada 24 horas
      this.cleanupInterval = setInterval(() => {
        this.executeCleanup();
      }, 24 * 60 * 60 * 1000); // 24 horas
      
    }, timeUntilTarget);

    console.log('✅ Agendador de limpeza iniciado (diário às 2 AM)');
  }

  private async executeCleanup(): Promise<void> {
    try {
      const result = await this.cleanupExpiredRegistrations();
      
      if (result.success) {
        console.log(`✅ Limpeza automática concluída: ${result.deletedCount} registros`);
      } else {
        console.log('❌ Falha na limpeza automática');
      }
    } catch (error) {
      console.error('❌ Erro no agendamento de limpeza:', error);
    }
  }

  stopScheduledCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Agendador de limpeza parado');
    }
  }

  // Método para limpeza manual (útil para testes)
  async manualCleanup(): Promise<{ deletedCount: number; success: boolean }> {
    return await this.cleanupExpiredRegistrations();
  }
}