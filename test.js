console.log('Process type:', process.type);
console.log('Module paths:', module.paths);
const electron = require('electron');
console.log('Electron type:', typeof electron);
console.log('Electron keys:', Object.keys(electron));
if (typeof electron === 'string') {
    console.log('Electron is string:', electron);
} else {
    console.log('Electron app:', electron.app);
}
