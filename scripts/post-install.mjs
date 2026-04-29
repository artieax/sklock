import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const skill = readFileSync(join(__dirname, '../skills/initialize/SKILL.md'), 'utf-8');
  process.stdout.write('\n[sklock] Run the initialize skill below to set up your workspace:\n\n');
  process.stdout.write(skill);
  process.stdout.write('\n');
} catch {
  // silent — don't break installs if the file is missing
}
