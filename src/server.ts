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
  console.log(
    colors.success.bold(`\n✨ Iniciando Auth Users Service`)
  );
  console.log(colors.info(`   📍 Porta: ${PORT}`));
  console.log(colors.info(`   🌿 Ambiente: ${NODE_ENV}`));
  console.log(colors.info(`   🏠 Host: ${HOST}`));
  console.log(colors.info(`   🔗 URL: http://localhost:${PORT}`));
}

function logAvailableEndpoints() {
  console.log(`\n📊 ${colors.cyan("ENDPOINTS DISPONÍVEIS:")}`);

  console.log(`\n${colors.yellow("🏠 ROTAS PRINCIPAIS")}`);
  console.log(`   ❤️  ${colors.green("Health:")} http://localhost:${PORT}/api/health`);
  console.log(`   🏠 ${colors.green("Welcome:")} http://localhost:${PORT}/api/`);
  console.log(`   ℹ️  ${colors.green("API Info:")} http://localhost:${PORT}/api/info`);

  console.log(`\n${colors.yellow("🔄 COMUNICAÇÃO COM GATEWAY")}`);
  console.log(`   🎯 ${colors.green("Gateway Test:")} http://localhost:${PORT}/api/gateway-test`);
  console.log(`   🔄 ${colors.green("Ping Gateway:")} http://localhost:${PORT}/api/ping-gateway`);

  console.log(`\n${colors.yellow("🔐 AUTENTICAÇÃO")}`);
  console.log(`   👤 ${colors.green("Register:")} http://localhost:${PORT}/api/auth/register`);
  console.log(`   🔐 ${colors.green("Login:")} http://localhost:${PORT}/api/auth/login`);

  console.log(`\n${colors.yellow("👥 GESTÃO DE USUÁRIOS")}`);
  console.log(`   👥 ${colors.green("Clients:")} http://localhost:${PORT}/api/clients`);
  console.log(`   💼 ${colors.green("Employees:")} http://localhost:${PORT}/api/employees`);
  console.log(`   👨‍💼 ${colors.green("Admins:")} http://localhost:${PORT}/api/admins`);

  console.log(`\n${colors.gray("🧪 TESTES INTERNOS")}`);
  console.log(`   ${colors.gray("🔧 Connection:")} http://localhost:${PORT}/api/test/connection`);
  console.log(`   ${colors.gray("🗄️  Database:")} http://localhost:${PORT}/api/test/database`);
  console.log(`   ${colors.gray("⚡ Performance:")} http://localhost:${PORT}/api/test/performance`);
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
    console.error(
      colors.error.bold(`\n💥 Falha na inicialização`)
    );
    console.error(
      colors.error(`   📋 Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
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
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM", () => process.exit(0)));

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