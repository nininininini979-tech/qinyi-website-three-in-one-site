import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

const files = filesBelow(root);
const sourceFiles = files.filter((file) => ['.html', '.js', '.json'].includes(extname(file)));
const bannedText = [
  'X-Demo-User-Id',
  'X-Tenant-Id',
  '村名待补充确认',
  '中文姓名待补充确认',
  'Ms. Xiao',
  'Jianmin',
  'Jiamin',
  'Jienmin',
  'Shangyuan',
  '建民',
  '第10号',
  '지앤민',
  '상위안촌',
  'رقم 10',
  'جيانمين',
  'شانغيوان',
  "Qinyi's protected quote channel",
  '勤益印刷受保护的报价渠道',
];

for (const file of sourceFiles) {
  const contents = readFileSync(file, 'utf8');
  for (const text of bannedText) {
    if (contents.includes(text)) failures.push(`${file.slice(root.length + 1)} contains banned text: ${text}`);
  }
}

for (const file of files.filter((item) => item.includes(`${join(root, 'ar')}/`) && extname(item) === '.html')) {
  if (!readFileSync(file, 'utf8').includes('<meta name="robots" content="noindex,follow">')) {
    failures.push(`${file.slice(root.length + 1)} must remain noindex until its translation is reviewed`);
  }
}

for (const locale of ['', 'en', 'zh-CN', 'es', 'de', 'fr', 'ja', 'ko', 'ar']) {
  const file = join(root, locale, 'index.html');
  const contents = readFileSync(file, 'utf8');
  for (const dependency of ['vendor/html2canvas.min.js', 'vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js']) {
    if (contents.includes(dependency)) failures.push(`${file.slice(root.length + 1)} eagerly loads ${dependency}`);
  }
}

for (const file of ['assets/app.js', 'assets/support.js', 'assets/customizer.js', 'assets/immersive-motion.js', 'assets/intro-scene.js']) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file} failed syntax check: ${result.stderr.trim()}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Site smoke checks passed (${sourceFiles.length} source files inspected).`);
