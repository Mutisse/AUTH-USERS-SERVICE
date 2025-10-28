"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleIdGenerator = void 0;
exports.generateUserId = generateUserId;
exports.generateBatchIds = generateBatchIds;
exports.validateId = validateId;
class SimpleIdGenerator {
    constructor() {
        this.usedIds = new Set();
    }
    static getInstance() {
        if (!SimpleIdGenerator.instance) {
            SimpleIdGenerator.instance = new SimpleIdGenerator();
        }
        return SimpleIdGenerator.instance;
    }
    generate() {
        let id;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            const randomPart = "URS" + this.generateRandomString(6);
            const hours = new Date().getHours().toString().padStart(2, "0");
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, "0");
            const day = now.getDate().toString().padStart(2, "0");
            const datePart = `${year}${month}${day}`;
            id = `${randomPart}${hours}${datePart}`;
            attempts++;
            if (attempts > maxAttempts) {
                throw new Error("Não foi possível gerar um ID único");
            }
        } while (this.usedIds.has(id));
        this.usedIds.add(id);
        return id;
    }
    generateRandomString(length) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    validate(id) {
        const pattern = /^URS[A-Z0-9]{6}-[0-9]{2}-[0-9]{4}\/[0-9]{2}\/[0-9]{2}$/;
        return pattern.test(id);
    }
    clearUsedIds() {
        this.usedIds.clear();
    }
}
exports.SimpleIdGenerator = SimpleIdGenerator;
function generateUserId() {
    return SimpleIdGenerator.getInstance().generate();
}
function generateBatchIds(count) {
    const generator = SimpleIdGenerator.getInstance();
    const ids = [];
    for (let i = 0; i < count; i++) {
        ids.push(generator.generate());
    }
    return ids;
}
function validateId(id) {
    return SimpleIdGenerator.getInstance().validate(id);
}
