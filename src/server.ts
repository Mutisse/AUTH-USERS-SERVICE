import 'dotenv/config'
import app from './app'
import { connectDB, disconnectDB } from './config/database'
import chalk from 'chalk'

const PORT = process.env.PORT || 3001
let server: ReturnType<typeof app.listen> | null = null

function logStartupInfo() {
  console.log(chalk.green.bold(`[${new Date().toISOString()}] 🚀 Iniciando User Service...`))
  console.log(chalk.blue(`   → Porta: ${PORT}`))
  console.log(chalk.blue(`   → Ambiente: ${process.env.NODE_ENV || 'development'}`))
  console.log(chalk.blue(`   → URL: http://localhost:${PORT}`))
  console.log(chalk.blue(`   → PID: ${process.pid}`))
}

async function start() {
  try {
    logStartupInfo()
    await connectDB()
    
    server = app.listen(PORT, () => {
      console.log(chalk.green.bold(`[${new Date().toISOString()}] 🏁 User Service pronto e aceitando conexões`))
    })
    
    attachErrorHandlers()
  } catch (error) {
    console.error(chalk.red.bold(`[${new Date().toISOString()}] ❌ Falha crítica durante a inicialização`))
    console.error(chalk.red(`   → Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`))
    process.exit(1)
  }
}

function shutdown(callback?: () => void) {
  if (!server) {
    console.log(chalk.yellow(`[${new Date().toISOString()}] ⚠️ Servidor já está parado`))
    callback?.()
    return
  }

  console.log(chalk.yellow(`[${new Date().toISOString()}] 🛑 Iniciando desligamento gracioso...`))
  
  server.close(async () => {
    console.log(chalk.yellow(`[${new Date().toISOString()}] 🛑 Servidor HTTP finalizado`))
    try {
      await disconnectDB()
      console.log(chalk.green(`[${new Date().toISOString()}] 📦 Todos os recursos liberados com sucesso`))
    } catch (error) {
      console.error(chalk.red(`[${new Date().toISOString()}] ❌ Erro durante a liberação de recursos`))
      console.error(chalk.red(`   → Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`))
    }
    server = null
    callback?.()
  })
}

function attachErrorHandlers() {
  process.on('SIGINT', () => shutdown(() => process.exit(0)))
  process.on('SIGTERM', () => shutdown(() => process.exit(0)))
  
  process.on('uncaughtException', (err) => {
    console.error(chalk.red.bold(`[${new Date().toISOString()}] 💥 Erro não capturado`))
    console.error(chalk.red(`   → Erro: ${err.message}`))
    console.error(chalk.red(`   → Stack: ${err.stack}`))
    shutdown(() => process.exit(1))
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red.bold(`[${new Date().toISOString()}] 🔥 Promessa rejeitada sem tratamento`))
    console.error(chalk.red(`   → Razão: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`))
    console.error(chalk.red(`   → Promessa: ${promise}`))
  })
}

start()