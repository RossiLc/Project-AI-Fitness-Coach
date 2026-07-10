#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const skillRoot = path.join(root, '.codex', 'skills');

const forbidden = [
  { name: 'Claude 用户级技能目录', pattern: /~\/\.claude\/skills|~\\\.claude\\skills/g },
  { name: 'Superpowers 用户级配置目录', pattern: /~\/\.config\/superpowers|~\\\.config\\superpowers/g },
  { name: '上游线程模块别名', pattern: /from\s+['"]~\/threads\/|import\s*\(\s*['"]~\/threads\//g },
  { name: 'Windows 用户目录绝对路径', pattern: /[A-Z]:\\Users\\/g },
  { name: 'macOS 用户目录绝对路径', pattern: /\/Users\/[^/\s]+/g },
  { name: 'Linux 用户目录绝对路径', pattern: /\/home\/[^/\s]+/g },
  { name: '用户环境变量路径', pattern: /%USERPROFILE%|\$HOME\/\.claude|\$HOME\/\.config\/superpowers/g },
];

const allowed = [
  '.codex/skills/writing-skills/anthropic-best-practices.md',
];

function matchesForbidden(text) {
  return forbidden.some((rule) => {
    rule.pattern.lastIndex = 0;
    return rule.pattern.test(text);
  });
}

if (process.argv.includes('--self-test')) {
  const positiveSamples = [
    String.raw`C:\Users\alice\.claude\skills`,
    '/Users/alice/.claude/skills',
    '/home/alice/.config/superpowers',
    '~/.claude/skills/debugging',
    '~/.config/superpowers/hooks',
    "import type { ThreadManager } from '~/threads/thread-manager';",
    '$HOME/.claude/skills',
    '%USERPROFILE%\\.claude\\skills',
  ];

  const negativeSamples = [
    '.codex/skills/systematic-debugging/SKILL.md',
    '.superpowers/sdd/progress.md',
    'docs/知识库/Superpowers运行时集成.md',
  ];

  const missed = positiveSamples.filter((sample) => !matchesForbidden(sample));
  const falsePositives = negativeSamples.filter((sample) => matchesForbidden(sample));

  if (missed.length > 0 || falsePositives.length > 0) {
    console.error('审计规则自检失败。');
    for (const sample of missed) console.error(`未命中：${sample}`);
    for (const sample of falsePositives) console.error(`误报：${sample}`);
    process.exit(1);
  }

  console.log('Superpowers 全局路径引用审计规则自检通过。');
  process.exit(0);
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toProjectPath(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

const files = await collectFiles(skillRoot);
const findings = [];

for (const file of files) {
  const projectPath = toProjectPath(file);
  if (allowed.includes(projectPath)) continue;

  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);

  for (const rule of forbidden) {
    rule.pattern.lastIndex = 0;
    for (let index = 0; index < lines.length; index += 1) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(lines[index])) {
        findings.push({
          file: projectPath,
          line: index + 1,
          rule: rule.name,
          text: lines[index].trim(),
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('发现 Superpowers 全局路径引用，请改为项目级路径或明确排除：');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
  }
  process.exit(1);
}

console.log('Superpowers 全局路径引用审计通过。');
