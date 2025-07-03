const chokidar = require('chokidar');
const { exec } = require('child_process');

const watcher = chokidar.watch('.', {
  ignored: /(^|[\/\\])\..|node_modules|velonic-themes/, // ignore dotfiles, node_modules, velonic-themes
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', path => {
  console.log(`File ${path} changed. Committing...`);
  exec(`git add . && git commit -m "Auto-commit: ${path} changed"`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Commit failed: ${stderr}`);
    } else {
      console.log(`Committed: ${stdout}`);
    }
  });
});

console.log('Auto-commit watcher is running...'); 