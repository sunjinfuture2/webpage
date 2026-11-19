// schedule/core/storage.ts keeps the Schedule app's data in IndexedDB. The WorkSpace keeps the schedule on its server, so only
// the checking functions of that file are used here; the database opener is never called.
export function openDB(): never { throw new Error('IndexedDB storage is not used in the WorkSpace'); }
