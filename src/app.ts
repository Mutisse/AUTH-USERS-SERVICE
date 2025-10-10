import express from 'express'
import cors from 'cors'
import userRoutes from './routes/user.routes'
import chalk from 'chalk'
import { requestLogger } from './middlewares/request-logger.middleware';
import { errorHandler, notFoundHandler } from '../src/middlewares/errorHandler';

const app = express()

// Middleware para logging de requisições
app.use((req, res, next) => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const statusColor = res.statusCode >= 400 ? chalk.red : chalk.green
    console.log(
      chalk.blue(`[${new Date().toISOString()}]`),
      chalk.bold(`${req.method} ${req.originalUrl}`),
      statusColor(`→ ${res.statusCode}`),
      chalk.yellow(`(${duration}ms)`)
    )
  })
  
  next()
})

app.use(cors())
app.use(express.json())


app.use(requestLogger);
app.use('/users', userRoutes)
// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: getTimestamp()
  });
});

// Tratamento de 404
app.use(notFoundHandler);

// Tratamento centralizado de erros
app.use(errorHandler);


// Middleware para rotas não encontradas
app.use((req, res, next) => {
  console.log(chalk.yellow(`[${new Date().toISOString()}] ⚠️ Rota não encontrada: ${req.method} ${req.originalUrl}`))
  res.status(404).json({ error: 'Rota não encontrada' })
})

// Middleware para tratamento de erros
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(chalk.red.bold(`[${new Date().toISOString()}] 🚨 Erro na rota ${req.method} ${req.originalUrl}`))
  console.error(chalk.red(`   → Erro: ${err.message}`))
  console.error(chalk.red(`   → Stack: ${err.stack}`))
  
  res.status(500).json({ 
    error: 'Erro interno no servidor',
    message: err.message
  })
})

export default app