import { OwlUSB } from './modules/owlusb.mjs';

const owlUSB = new OwlUSB();
owlUSB.on('live', (record) => console.log(JSON.stringify(record)))