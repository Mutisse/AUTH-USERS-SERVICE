import { Request, Response, NextFunction } from "express";
import chalk from "chalk";

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

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.url;
    const status = res.statusCode;
    const contentLength = res.get("Content-Length") || "0";

    // 🎯 CORES BASEADAS NO STATUS
    const statusColor =
      status >= 500
        ? colors.error
        : status >= 400
        ? colors.warning
        : status >= 300
        ? colors.cyan
        : colors.success;

    console.log(
      colors.gray(`[${new Date().toISOString()}]`),
      colors.info(method),
      url,
      statusColor(`${status}`),
      colors.gray(`${duration}ms`),
      colors.gray(`${contentLength}b`)
    );
  });

  next();
};
