"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const deobfuscator_1 = require("./deobfuscator");
const fs_1 = __importDefault(require("fs"));
const src = fs_1.default.readFileSync('input/challenge.js').toString();
const session = new deobfuscator_1.Deobfusactor(src);
session.loadContext();
session.unconcealStrings();
session.simplifyProxyFunctions();
fs_1.default.writeFileSync("output.js", session.$script.codegen()[0]);
