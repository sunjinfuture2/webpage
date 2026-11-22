import fs from 'node:fs/promises';
await fs.copyFile(new URL('./seed.json',import.meta.url),new URL('./4a8dacb366f2fd2244e3e9a32d6e37628cc31a71-seed.json',import.meta.url));
console.log('Prepared seed text module for the supplied Worker.');
