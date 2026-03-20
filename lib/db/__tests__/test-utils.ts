import Dexie from "dexie";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";

// Create persistent fake IndexedDB
const fakeIndexedDB = new IDBFactory();

// Set up globals
if (typeof global.indexedDB === "undefined") {
  global.indexedDB = fakeIndexedDB;
  global.IDBKeyRange = IDBKeyRange;
}

// Force Dexie to use fake IndexedDB
Dexie.dependencies.indexedDB = fakeIndexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
