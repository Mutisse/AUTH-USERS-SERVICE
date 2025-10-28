"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomSessionId = generateCustomSessionId;
exports.generateCustomActivityId = generateCustomActivityId;
function generateCustomSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `SES${timestamp}${random}`.toUpperCase();
}
function generateCustomActivityId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ACT${timestamp}${random}`.toUpperCase();
}
