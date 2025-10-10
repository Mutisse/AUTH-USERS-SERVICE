import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`Response (${res.statusCode}):`, body);
    return originalSend.call(this, body);
  };
  
  next();
}