"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const chalk_1 = __importDefault(require("chalk"));
const colors = {
    success: chalk_1.default.green,
    info: chalk_1.default.blue,
    warning: chalk_1.default.yellow,
    error: chalk_1.default.red,
    debug: chalk_1.default.magenta,
    gray: chalk_1.default.gray,
    cyan: chalk_1.default.cyan,
};
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const method = req.method;
        const url = req.url;
        const status = res.statusCode;
        const contentLength = res.get("Content-Length") || "0";
        const statusColor = status >= 500
            ? colors.error
            : status >= 400
                ? colors.warning
                : status >= 300
                    ? colors.cyan
                    : colors.success;
        console.log(colors.gray(`[${new Date().toISOString()}]`), colors.info(method), url, statusColor(`${status}`), colors.gray(`${duration}ms`), colors.gray(`${contentLength}b`));
    });
    next();
};
exports.requestLogger = requestLogger;
