console.log('--- DEBUG START ---');
console.log('Process ExecPath:', process.execPath);
console.log('Process Versions:', JSON.stringify(process.versions, null, 2));
console.log('Process Type:', process.type);
console.log('ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);

try {
    const electronPath = require.resolve('electron');
    console.log('Resolved electron path:', electronPath);
} catch (e) {
    console.log('Could not resolve electron:', e.message);
}

const electron = require('electron');
console.log('Type of electron export:', typeof electron);
if (typeof electron === 'string') {
    console.log('Electron export value:', electron);
} else {
    console.log('Electron app is available:', !!electron.app);
}
console.log('--- DEBUG END ---');
