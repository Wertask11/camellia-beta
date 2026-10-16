import {spawnSync} from 'node:child_process';
const suites=['attribution-cases','auth-callback-cases','beta2-cases','check-entry-cases','check-ui-cases','check-interaction','conversation-cases','conversation-intent-cases','daily-flow-cases','daily-reflection-cases','first-experience-cases','gemini-chat-cases','chat-availability-cases','chat-api-entry-cases','server-sdk-compatibility','conversation-threads-cases','conversation-library-interaction','schoolpark-sync-cases','analytics-privacy','recommendation-scenarios','today-one-flow-cases','phase1-cases','gentle-insights','profile-restore','camellia-delete'];
let failures=0;
for(const suite of suites){const result=spawnSync(process.execPath,[`tests/${suite}.mjs`],{stdio:'inherit',timeout:120_000});if(result.status!==0){failures++;console.error(`FAIL ${suite}`,result.error?.message??result.signal??result.status);}}
console.log(`${suites.length-failures}/${suites.length} suites passed`);process.exitCode=failures?1:0;
