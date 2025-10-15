import "dotenv/config";
import app from "./app";
import chalk from "chalk";
import databaseManager from "./config/database";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

let server: ReturnType<typeof app.listen> | null = null;

// 🎯 CORES PADRONIZADAS
const colors = {
  success: chalk.green,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta,
  gray: chalk.gray,
  cyan: chalk.cyan,
  yellow: chalk.yellow,
  green: chalk.green,
};

function logStartupInfo() {
  console.log(colors.success.bold(`\n✨ Iniciando Auth Users Service`));
  console.log(colors.info(`   📍 Porta: ${PORT}`));
  console.log(colors.info(`   🌿 Ambiente: ${NODE_ENV}`));
  console.log(colors.info(`   🏠 Host: ${HOST}`));
  console.log(colors.info(`   🔗 URL: http://localhost:${PORT}`));
}

function logAvailableEndpoints() {
  console.log(`\n📊 ${colors.cyan("ENDPOINTS DISPONÍVEIS:")}`);

  console.log(`\n${colors.yellow("🏠 ROTAS PRINCIPAIS")}`);
  console.log(
    `   ❤️  ${colors.green(
      "Health:"
    )} http://localhost:${PORT}/UserService/health`
  );
  console.log(
    `   🏠 ${colors.green("Welcome:")} http://localhost:${PORT}/UserService/`
  );
  console.log(
    `   🔍 ${colors.green(
      "Diagnóstico:"
    )} http://localhost:${PORT}/UserService/diagnostic/system-analysis`
  );

  console.log(`\n${colors.yellow("🔐 AUTENTICAÇÃO")}`);
  console.log(
    `   👤 ${colors.green(
      "Register:"
    )} http://localhost:${PORT}/UserService/auth/register`
  );
  console.log(
    `   🔐 ${colors.green(
      "Login:"
    )} http://localhost:${PORT}/UserService/auth/login`
  );
  console.log(
    `   📧 ${colors.green(
      "Check Email:"
    )} http://localhost:${PORT}/UserService/auth/check-email`
  );
  console.log(
    `   🔄 ${colors.green(
      "Refresh Token:"
    )} http://localhost:${PORT}/UserService/auth/refresh-token`
  );
  console.log(
    `   🚪 ${colors.green(
      "Logout:"
    )} http://localhost:${PORT}/UserService/auth/logout`
  );
  console.log(
    `   🔑 ${colors.green(
      "Forgot Password:"
    )} http://localhost:${PORT}/UserService/auth/forgot-password`
  );
  console.log(
    `   🔄 ${colors.green(
      "Reset Password:"
    )} http://localhost:${PORT}/UserService/auth/reset-password`
  );

  console.log(`\n${colors.yellow("👥 GESTÃO DE USUÁRIOS")}`);
  console.log(
    `   👥 ${colors.green(
      "Clients:"
    )} http://localhost:${PORT}/UserService/clients`
  );
  console.log(
    `   💼 ${colors.green(
      "Employees:"
    )} http://localhost:${PORT}/UserService/employees`
  );
  console.log(
    `   👨‍💼 ${colors.green(
      "Admins:"
    )} http://localhost:${PORT}/UserService/admins`
  );

  console.log(`\n${colors.yellow("📱 OTP SERVICE")}`);
  console.log(
    `   📤 ${colors.green(
      "Send OTP:"
    )} http://localhost:${PORT}/UserService/otp/send`
  );
  console.log(
    `   ✅ ${colors.green(
      "Verify OTP:"
    )} http://localhost:${PORT}/UserService/otp/verify`
  );
  console.log(
    `   🔄 ${colors.green(
      "Resend OTP:"
    )} http://localhost:${PORT}/UserService/otp/resend`
  );

  console.log(`\n${colors.yellow("🩺 DIAGNÓSTICO")}`);
  console.log(
    `   🔍 ${colors.green(
      "System Analysis:"
    )} http://localhost:${PORT}/UserService/diagnostic/system-analysis`
  );
  console.log(
    `   🗂️ ${colors.green(
      "Routes Detailed:"
    )} http://localhost:${PORT}/UserService/diagnostic/routes-detailed`
  );
  console.log(
    `   📦 ${colors.green(
      "Dependencies:"
    )} http://localhost:${PORT}/UserService/diagnostic/dependencies`
  );
  console.log(
    `   🌐 ${colors.green(
      "Services Status:"
    )} http://localhost:${PORT}/UserService/diagnostic/services-status`
  );
  console.log(
    `   🔗 ${colors.green(
      "Connectivity Test:"
    )} http://localhost:${PORT}/UserService/diagnostic/connectivity-test`
  );

  console.log(`\n${colors.yellow("🔐 SESSÕES")}`);
  console.log(
    `   📋 ${colors.green(
      "Sessions:"
    )} http://localhost:${PORT}/UserService/sessions`
  );
  console.log(
    `   👥 ${colors.green(
      "Active Sessions:"
    )} http://localhost:${PORT}/UserService/auth/active-sessions`
  );

  console.log(
    `\n${colors.gray("💡 DICA:")} Use ${colors.cyan(
      "/UserService/health"
    )} para ver todos os endpoints disponíveis`
  );
}

async function startServer() {
  try {
    logStartupInfo();

    console.log(colors.debug("🗄️  Conectando ao MongoDB..."));
    await databaseManager.connectDB();

    server = app.listen(PORT, HOST, () => {
      console.log(
        colors.success.bold(`\n🎉 Auth Users Service iniciado com sucesso!`)
      );

      logAvailableEndpoints();

      console.log(
        colors.gray(`\n⏰ Iniciado em: ${new Date().toLocaleString("pt-BR")}`)
      );
      console.log(`\n🚀 ${colors.success("Serviço pronto!")}\n`);
    });

    attachErrorHandlers();
  } catch (error) {
    console.error(colors.error.bold(`\n💥 Falha na inicialização`));
    console.error(
      colors.error(
        `   📋 Erro: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      )
    );
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string, callback?: () => void) {
  console.log(colors.warning(`\n🔄 Recebido ${signal}, encerrando...`));

  if (!server) {
    console.log(colors.warning(`⚠️  Servidor já parado`));
    callback?.();
    return;
  }

  try {
    server.close(async () => {
      console.log(colors.info(`🛑 Servidor finalizado`));
      await databaseManager.disconnectDB();
      console.log(colors.info(`📦 MongoDB desconectado`));
      server = null;
      console.log(colors.success(`✅ Recursos liberados`));
      callback?.();
    });

    setTimeout(() => {
      console.error(colors.error(`⏰ Timeout no desligamento`));
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error(colors.error(`❌ Erro no desligamento`));
    process.exit(1);
  }
}

function attachErrorHandlers() {
  process.on("SIGINT", () => gracefulShutdown("SIGINT", () => process.exit(0)));
  process.on("SIGTERM", () =>
    gracefulShutdown("SIGTERM", () => process.exit(0))
  );

  process.on("uncaughtException", (err) => {
    console.error(colors.error.bold(`\n🚨 Erro não capturado`));
    console.error(colors.error(`   📝 ${err.message}`));
    gracefulShutdown("uncaughtException", () => process.exit(1));
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error(colors.error.bold(`\n⚠️  Promessa rejeitada`));
  });
}

startServer();

export { gracefulShutdown };
