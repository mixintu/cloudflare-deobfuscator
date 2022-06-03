import { Deobfusactor } from "./deobfuscator";

import fs from 'fs';
const src = fs.readFileSync('input/challenge.js').toString()



const session = new Deobfusactor(src)

session.loadContext()

session.unconcealStrings()
session.simplifyProxyFunctions()

fs.writeFileSync("output.js", session.$script.codegen()[0])