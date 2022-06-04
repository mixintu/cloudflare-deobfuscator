import { Deobfusactor } from "./deobfuscator";

import fs from 'fs';
const src = fs.readFileSync('input/main_challenge.js').toString()



const session = new Deobfusactor(src)






fs.writeFileSync("output.js", session.deobfuscateMainChallenge())