const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');
const excludedDirectories = new Set(['node_modules', 'public', 'coverage']);

function findJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return excludedDirectories.has(entry.name) ? [] : findJavaScriptFiles(absolutePath);
    }

    return entry.isFile() && entry.name.endsWith('.js') ? [absolutePath] : [];
  });
}

const files = findJavaScriptFiles(backendRoot);

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}

console.log(`Backend syntax check passed (${files.length} files).`);
