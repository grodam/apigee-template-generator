// Browser polyfills for Node.js APIs
import process from 'process';
import { Buffer } from 'buffer';

// Inject process and Buffer into global scope
(window as any).process = process;
(window as any).Buffer = Buffer;
(window as any).global = globalThis;
