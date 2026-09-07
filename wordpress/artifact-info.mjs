import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ sourceCommit: manifest.sourceCommit, recordCount: manifest.records, mode: manifest.mode }));
