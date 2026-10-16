import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--project','demo-camellia','--config','tests/firestore-emulator.json','--only','firestore','node tests/phase1-firestore.mjs'],{stdio:'inherit',env:{...process.env,FIREBASE_EMULATORS_PATH:resolve('work/emulators'),XDG_CONFIG_HOME:resolve('work/firebase-config')}});
child.on('exit',code=>{process.exitCode=code??1;});
