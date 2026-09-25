import fs from 'node:fs';

const path = new URL('./app.json', import.meta.url);
const app = JSON.parse(fs.readFileSync(path, 'utf8'));
app.expo ??= {};
app.expo.extra ??= {};
app.expo.extra.eas ??= {};
app.expo.extra.eas.projectId = 'eebdb1e2-da7c-4f58-b359-211993c3e061';
fs.writeFileSync(path, JSON.stringify(app, null, 2) + '\n');
console.log('EAS projectId injected:', app.expo.extra.eas.projectId);
