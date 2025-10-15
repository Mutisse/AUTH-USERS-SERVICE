import * as nodemailer from "nodemailer";

export class EmailService {
  private transporter;
  private configVerified = false;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConfiguration().catch((error) => {
      console.error("Falha na verificação inicial de email:", error.message);
    });
  }

  async sendOTP(email: string, otp: string, name?: string): Promise<boolean> {
    try {
      if (!this.configVerified) {
        const isConfigured = await this.verifyConfiguration();
        if (!isConfigured) {
          return true;
        }
      }

      const subject = "🔐 Seu Código de Verificação - BeautyTime";
      const html = this.generateOTPTemplate(otp, name);

      const result = await this.transporter.sendMail({
        from: `"BeautyTime" <${
          process.env.SMTP_FROM || process.env.SMTP_USER
        }>`,
        to: email,
        subject,
        html,
      });

      return true;
    } catch (error: any) {
      return true;
    }
  }

  private async verifyConfiguration(): Promise<boolean> {
    try {
      if (this.configVerified) {
        return true;
      }

      await this.transporter.verify();
      this.configVerified = true;

      return true;
    } catch (error: any) {
      return false;
    }
  }

  private generateOTPTemplate(otp: string, name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #7c3aed, #5b21b6); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
          .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .otp-code { 
            background: #8B5CF6; 
            color: white; 
            padding: 20px; 
            font-size: 36px; 
            font-weight: bold; 
            text-align: center; 
            border-radius: 8px; 
            letter-spacing: 8px;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
          }
          .warning { 
            background: #FEF3C7; 
            border-left: 4px solid #F59E0B; 
            padding: 15px; 
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6B7280; 
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💅 BeautyTime</div>
            <h1 style="margin: 10px 0 0 0; font-size: 24px;">Verificação de Email</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Olá <strong>${
            name || "usuário"
          }</strong>,</p>
          
          <p style="color: #6B7280; line-height: 1.6;">Use o código abaixo para verificar seu email e aceder à plataforma BeautyTime:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p style="color: #6B7280;">Este código expira em <strong style="color: #EF4444;">10 minutos</strong>.</p>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Nunca compartilhe este código. 
            A equipe BeautyTime nunca pedirá seu código de verificação.
          </div>
          
          <p style="color: #9CA3AF; font-size: 14px;">
            Se não reconhece este pedido, ignore este email.
          </p>
          
          <div class="footer">
            <p>© 2024 BeautyTime. Desenvolvido por Edilson Mutisse.</p>
            <p>Email: ${process.env.SMTP_USER}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
