import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(app, 'dist');
const target = path.resolve(app, '../../previews/scheduler');
const allowedRoot = new Set(['assets', 'licenses', 'index.html', 'favicon.svg']);
async function inspect(directory, root = true) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (root && !allowedRoot.has(entry.name)) throw new Error('Unexpected public build entry: ' + entry.name);
    if (/\.(json|xlsx?|pdf|png|jpe?g|webp|map)$/i.test(entry.name)) throw new Error('Document or evidence must not be published: ' + entry.name);
    if (entry.isDirectory()) await inspect(path.join(directory, entry.name), false);
    else if (!entry.isFile()) throw new Error('Only regular build files may be published.');
  }
}
await inspect(dist);
await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });
console.log('Prepared public preview in previews/scheduler (app assets only; no source documents).');
