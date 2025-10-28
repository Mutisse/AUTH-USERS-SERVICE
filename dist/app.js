"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const chalk_1 = __importDefault(require("chalk"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const body_parser_1 = __importDefault(require("body-parser"));
const all_user_routes_1 = __importDefault(require("./routes/all-user.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const getTimestamp = () => chalk_1.default.gray(`[${new Date().toISOString()}]`);
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(body_parser_1.default.json({
    limit: "10mb",
    strict: false,
}));
app.use(body_parser_1.default.urlencoded({
    extended: true,
    limit: "10mb",
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use((req, res, next) => {
    console.log("🔍 [USER SERVICE DEBUG] Body parsing check:");
    console.log("🔍 Body type:", typeof req.body);
    console.log("🔍 Body keys:", Object.keys(req.body));
    console.log("🔍 Body content:", JSON.stringify(req.body).substring(0, 300));
    console.log("🔍 Content-Type:", req.headers["content-type"]);
    next();
});
app.use((req, res, next) => {
    const start = Date.now();
    console.log(getTimestamp(), chalk_1.default.cyan("⬅️"), req.method, req.path);
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const bodyCopy = { ...req.body };
        if (bodyCopy.password) {
            bodyCopy.password = "********";
        }
        if (bodyCopy.newPassword) {
            bodyCopy.newPassword = "********";
        }
        if (bodyCopy.confirmPassword) {
            bodyCopy.confirmPassword = "********";
        }
        if (bodyCopy.otpCode) {
            bodyCopy.otpCode = "******";
        }
        console.log(getTimestamp(), chalk_1.default.yellow("📦 CORPO DA REQUISIÇÃO:"), JSON.stringify(bodyCopy, null, 2));
    }
    else {
        console.log(getTimestamp(), chalk_1.default.gray("📦 CORPO DA REQUISIÇÃO:"), "{}");
    }
    if (Object.keys(req.query).length > 0) {
        console.log(getTimestamp(), chalk_1.default.blue("🔍 QUERY PARAMS:"), JSON.stringify(req.query, null, 2));
    }
    const relevantHeaders = {
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
        "x-forwarded-for": req.headers["x-forwarded-for"],
        "x-service-source": req.headers["x-service-source"] || "gateway",
    };
    console.log(getTimestamp(), chalk_1.default.magenta("📋 HEADERS:"), JSON.stringify(relevantHeaders, null, 2));
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody;
    res.send = function (body) {
        responseBody = body;
        return originalSend.call(this, body);
    };
    res.json = function (body) {
        responseBody = body;
        return originalJson.call(this, body);
    };
    res.on("finish", () => {
        const duration = Date.now() - start;
        const statusIcon = res.statusCode >= 400 ? "❌" : "✅";
        const statusColor = res.statusCode >= 400 ? chalk_1.default.red : chalk_1.default.green;
        console.log(getTimestamp(), statusColor(statusIcon), req.method, req.path, res.statusCode, chalk_1.default.magenta(`${duration}ms`));
        if (responseBody && duration > 50) {
            try {
                const responseStr = typeof responseBody === "string"
                    ? responseBody
                    : JSON.stringify(responseBody);
                if (responseStr.length < 500) {
                    console.log(getTimestamp(), chalk_1.default.green("📤 RESPOSTA:"), responseStr);
                }
                else {
                    console.log(getTimestamp(), chalk_1.default.green("📤 RESPOSTA:"), responseStr.substring(0, 200) + "...");
                }
            }
            catch (e) {
                console.log(getTimestamp(), chalk_1.default.green("📤 RESPOSTA:"), "[NÃO PODE SER SERIALIZADO]");
            }
        }
        if (duration > 1000) {
            console.log(getTimestamp(), chalk_1.default.red("🐌 REQUISIÇÃO LENTA:"), `${duration}ms`);
        }
    });
    next();
});
app.use(all_user_routes_1.default);
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        service: "User Service",
        timestamp: new Date().toISOString(),
        version: "2.2.0",
        body_parsing: "FIXED",
    });
});
app.get("/", (req, res) => {
    res.json({
        message: "👥 User Service",
        status: "running",
        timestamp: new Date().toISOString(),
        version: "2.2.0",
        body_parsing: "CORRECT_ORDER",
    });
});
app.use((req, res) => {
    res.status(404).json({
        statusCode: 404,
        message: "Endpoint não encontrado",
        path: req.path,
        timestamp: new Date().toISOString(),
    });
});
app.use((req, res, next) => {
    console.log(`📍 [USER SERVICE ROUTE] ${req.method} ${req.path}`);
    next();
});
exports.default = app;
