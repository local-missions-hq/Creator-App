import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((file) => !/\.(docx|pdf|png|jpe?g|gif|webp)$/i.test(file));

const highConfidencePatterns = [
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/,
  /whsec_[A-Za-z0-9]{16,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AccountKey=[A-Za-z0-9+/=]{20,}/,
];

const findings = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of highConfidencePatterns) {
    if (pattern.test(content)) findings.push(`${file}: ${pattern.source}`);
  }
}

if (findings.length > 0) {
  console.error(`Potential secrets found:\n${findings.join('\n')}`);
  process.exit(1);
}

console.log(`Local high-confidence secret scan passed for ${files.length} text files.`);
