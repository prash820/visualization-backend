"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.createUser = createUser;
exports.validateUser = validateUser;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const DATA_FILE = path_1.default.join(__dirname, "../../users.json");
function readAll() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const file = yield promises_1.default.readFile(DATA_FILE, "utf-8");
            return JSON.parse(file);
        }
        catch (_a) {
            return [];
        }
    });
}
function writeAll(users) {
    return __awaiter(this, void 0, void 0, function* () {
        yield promises_1.default.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
    });
}
function findUserByEmail(email) {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield readAll();
        return users.find(u => u.email === email);
    });
}
function createUser(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield readAll();
        if (users.find(u => u.email === email)) {
            throw new Error("User already exists");
        }
        const passwordHash = yield bcrypt_1.default.hash(password, 10);
        const user = {
            _id: (0, uuid_1.v4)(),
            email,
            passwordHash,
            createdAt: new Date().toISOString(),
        };
        users.push(user);
        yield writeAll(users);
        return user;
    });
}
function validateUser(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield findUserByEmail(email);
        if (!user)
            return null;
        const valid = yield bcrypt_1.default.compare(password, user.passwordHash);
        return valid ? user : null;
    });
}
