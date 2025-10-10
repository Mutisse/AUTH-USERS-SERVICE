import mongoose from 'mongoose'
import chalk from 'chalk'

// Eventos de conexão para monitoramento
mongoose.connection.on('connected', () => {
  console.log(chalk.blue(`[${new Date().toISOString()}] 📊 Conexão MongoDB estabelecida`))
})

mongoose.connection.on('disconnected', () => {
  console.log(chalk.yellow(`[${new Date().toISOString()}] ⚠️ Conexão MongoDB perdida`))
})

mongoose.connection.on('reconnected', () => {
  console.log(chalk.green(`[${new Date().toISOString()}] 🔄 Conexão MongoDB reestabelecida`))
})

mongoose.connection.on('error', (error) => {
  console.error(chalk.red.bold(`[${new Date().toISOString()}] ❌ Erro na conexão MongoDB`))
  console.error(chalk.red(`   → Detalhes: ${error.message}`))
})

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || ''
  if (!uri) throw new Error('MONGODB_URI não definido no .env')

  try {
    const startTime = Date.now()
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    })
    
    const connectionTime = Date.now() - startTime
    
    console.log(chalk.green.bold(`[${new Date().toISOString()}] ✅ MongoDB Atlas conectado com sucesso!`))
    console.log(chalk.blue(`   → Cluster: ${mongoose.connection.host}`))
    console.log(chalk.blue(`   → Database: ${mongoose.connection.name}`))
    console.log(chalk.blue(`   → Tempo de conexão: ${connectionTime}ms`))
    console.log(chalk.blue(`   → Status: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`))
  } catch (error) {
    console.error(chalk.red.bold(`[${new Date().toISOString()}] ❌ Falha ao conectar ao MongoDB Atlas`))
    console.error(chalk.red(`   → Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`))
    throw error
  }
}

const disconnectDB = async () => {
  try {
    await mongoose.disconnect()
    console.log(chalk.yellow.bold(`[${new Date().toISOString()}] 📦 MongoDB desconectado com sucesso`))
  } catch (error) {
    console.error(chalk.red.bold(`[${new Date().toISOString()}] ❌ Falha ao desconectar do MongoDB`))
    console.error(chalk.red(`   → Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`))
    throw error
  }
}

export { connectDB, disconnectDB }