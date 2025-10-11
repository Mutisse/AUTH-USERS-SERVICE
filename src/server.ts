import "dotenv/config";
import app from "./app";
import chalk from "chalk";
import databaseManager from "./config/database";

const PORT = process.env.PORT || 3001;

let server: ReturnType<typeof app.listen> | null = null;

// 🎯 CORES PADRONIZADAS COM O GATEWAY
const colors = {
  success: chalk.green,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta,
  gray: chalk.gray,
  cyan: chalk.cyan,
};


function logStartupInfo() {
  console.log(
    colors.success.bold(
      `\n✨ [${new Date().toISOString()}] Iniciando User Service`
    )
  );
  console.log(colors.info(`   📍 Porta: ${PORT}`));
  console.log(
    colors.info(`   🌿 Ambiente: ${process.env.NODE_ENV || "development"}`)
  );
  console.log(colors.info(`   🔗 URL: http://localhost:${PORT}`));
  console.log(colors.info(`   🆔 PID: ${process.pid}`));
  console.log(colors.info(`   🛠️  Serviços: Authentication + User Management`));
}

async function startServer() {
  try {
    logStartupInfo();

    // 1. ✅ CONEXÃO COM MONGODB
    console.log(colors.debug("🗄️  Conectando ao MongoDB..."));
    await databaseManager.connectDB();

    const dbStatus = databaseManager.getConnectionStatus();
    console.log(colors.success("🗄️  ✅ MongoDB conectado - User Service"));

    // 2. INICIA SERVIDOR HTTP
    server = app.listen(PORT, () => {
      console.log(
        colors.success.bold(
          `\n🎉 [${new Date().toISOString()}] User Service pronto!`
        )
      );
      console.log(
        colors.cyan(`   ❤️  Health: http://localhost:${PORT}/health`)
      );
      console.log(colors.cyan(`   🔐 Auth: http://localhost:${PORT}/api/auth`));
      console.log(
        colors.cyan(`   👥 Users: http://localhost:${PORT}/api/users`)
      );
      console.log(
        colors.gray(`   ⏰ Iniciado em: ${new Date().toLocaleString("pt-BR")}`)
      );
    });

    attachErrorHandlers();
  } catch (error) {
    console.error(
      colors.error.bold(
        `\n💥 [${new Date().toISOString()}] Falha na inicialização`
      )
    );
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
  console.log(
    colors.warning(
      `\n🔄 [${new Date().toISOString()}] Recebido ${signal}, encerrando...`
    )
  );

  if (!server) {
    console.log(
      colors.warning(`[${new Date().toISOString()}] ⚠️  Servidor já parado`)
    );
    callback?.();
    return;
  }

  try {
    server.close(async () => {
      console.log(
        colors.info(`[${new Date().toISOString()}] 🛑 Servidor finalizado`)
      );

      await databaseManager.disconnectDB();
      console.log(
        colors.info(`[${new Date().toISOString()}] 📦 MongoDB desconectado`)
      );

      server = null;
      console.log(
        colors.success(`[${new Date().toISOString()}] ✅ Recursos liberados`)
      );
      callback?.();
    });

    setTimeout(() => {
      console.error(
        colors.error(`[${new Date().toISOString()}] ⏰ Timeout no desligamento`)
      );
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error(
      colors.error(`[${new Date().toISOString()}] ❌ Erro no desligamento`)
    );
    process.exit(1);
  }
}

function attachErrorHandlers() {
  process.on("SIGINT", () => gracefulShutdown("SIGINT", () => process.exit(0)));
  process.on("SIGTERM", () =>
    gracefulShutdown("SIGTERM", () => process.exit(0))
  );

  process.on("uncaughtException", (err) => {
    console.error(
      colors.error.bold(`\n🚨 [${new Date().toISOString()}] Erro não capturado`)
    );
    console.error(colors.error(`   📝 ${err.message}`));
    gracefulShutdown("uncaughtException", () => process.exit(1));
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error(
      colors.error.bold(
        `\n⚠️  [${new Date().toISOString()}] Promessa rejeitada`
      )
    );
  });
}

// Inicia o servidor
startServer();

export { gracefulShutdown };
