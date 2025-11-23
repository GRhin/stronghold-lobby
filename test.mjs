import electron from 'electron';
console.log('Default export:', electron);
try {
    const { app } = electron;
    console.log('Destructured app:', app);
} catch (e) {
    console.log('Destructuring failed:', e.message);
}

import * as electronNamespace from 'electron';
console.log('Namespace export keys:', Object.keys(electronNamespace));
