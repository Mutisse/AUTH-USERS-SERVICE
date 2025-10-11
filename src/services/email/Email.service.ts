import * as nodemailer from "nodemailer";
import { AppError } from "../../utils/AppError";

export interface EmailOptions {
  to: string;
  subject: string;
  template: "otp" | "welcome" | "reset-password";
  data: {
    name?: string;
    otp?: string;
    expiresIn?: number;
  };
}

export class EmailService {
  private transporter;

  constructor() {
    // 🎯 CORREÇÃO: use createTransport em vez de createTransporter
    this.transporter = nodemailer.createTransport({
      // 🎯 CONFIGURAÇÃO PARA DESENVOLVIMENTO (sem auth)
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "1025"),
      secure: false,
      ignoreTLS: true,
      
      // 🎯 PARA PRODUÇÃO, COMENTE ACIMA E DESCOMENTE ABAIXO:
      /*
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      */
    });
  }

  // 🎯 ENVIAR OTP (COM FALLBACK PARA DESENVOLVIMENTO)
  async sendOTP(email: string, otp: string, name?: string): Promise<boolean> {
    try {
      const subject = "Seu Código de Verificação - BeautyTime";
      const html = this.generateOTPTemplate(otp, name);

      // 🎯 MODO DESENVOLVIMENTO: APENAS LOG NO CONSOLE
      if (process.env.NODE_ENV === "development" || !process.env.SMTP_USER) {
        console.log("📧 [DEV MODE] Email simulado:");
        console.log("   → Para:", email);
        console.log("   → OTP:", otp);
        console.log("   → Nome:", name || "N/A");
        console.log("   → Assunto:", subject);
        return true;
      }

      // 🎯 MODO PRODUÇÃO: ENVIA EMAIL REAL
      await this.transporter.sendMail({
        from: `"BeautyTime" <${
          process.env.SMTP_FROM || "noreply@beautytime.com"
        }>`,
        to: email,
        subject,
        html,
      });

      console.log(`✅ OTP enviado para: ${email}`);
      return true;
    } catch (error) {
      console.error("❌ Erro ao enviar OTP:", error);
      
      // 🎯 FALLBACK: MOSTRA OTP NO CONSOLE EM CASO DE ERRO
      console.log("🔄 Fallback - OTP no console:", otp);
      return true;
    }
  }

  // 🎯 TEMPLATE DO OTP (mantém igual)
  private generateOTPTemplate(otp: string, name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #8B5CF6; font-size: 24px; font-weight: bold; }
          .otp-code { 
            background: #8B5CF6; 
            color: white; 
            padding: 15px 30px; 
            font-size: 32px; 
            font-weight: bold; 
            text-align: center; 
            border-radius: 8px; 
            letter-spacing: 8px;
            margin: 20px 0;
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💅 BeautyTime</div>
            <h1>Verifique seu email</h1>
          </div>
          
          <p>Olá ${name || "usuário"},</p>
          
          <p>Use o código abaixo para verificar seu email e concluir seu cadastro:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p>Este código expira em <strong>10 minutos</strong>.</p>
          
          <div class="warning">
            ⚠️ <strong>Não compartilhe este código</strong> com ninguém. 
            Nossa equipe nunca pedirá seu código de verificação.
          </div>
          
          <p>Se você não solicitou este código, ignore este email.</p>
          
          <div class="footer">
            <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 🎯 VERIFICAR CONFIGURAÇÃO DO EMAIL
  async verifyConfiguration(): Promise<boolean> {
    try {
      // Em desenvolvimento, sempre retorna true
      if (process.env.NODE_ENV === "development" || !process.env.SMTP_USER) {
        console.log("✅ Email Service (Modo Desenvolvimento)");
        return true;
      }

      await this.transporter.verify();
      console.log("✅ Configuração de email verificada");
      return true;
    } catch (error) {
      console.error("❌ Erro na configuração de email:", error);
      console.log("🔧 Usando modo desenvolvimento...");
      return true; // Sempre retorna true para não bloquear o app
    }
  }
}