import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const configPath = path.resolve('ios/App/App/capacitor.config.json');
const pluginClasses = ['HealthKitPlugin', 'HydrationReminderPlugin'];

const rawConfig = await readFile(configPath, 'utf8');
const config = JSON.parse(rawConfig);
const packageClassList = Array.isArray(config.packageClassList) ? config.packageClassList : [];

for (const pluginClass of pluginClasses) {
  if (!packageClassList.includes(pluginClass)) {
    packageClassList.push(pluginClass);
  }
}

config.packageClassList = packageClassList;
await writeFile(configPath, `${JSON.stringify(config, null, '\t')}\n`);

console.log(`Patched iOS Capacitor plugin list: ${config.packageClassList.join(', ')}`);
