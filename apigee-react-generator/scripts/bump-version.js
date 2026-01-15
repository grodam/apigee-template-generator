#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PACKAGE_JSON = path.join(rootDir, 'package.json');
const TAURI_CONF = path.join(rootDir, 'src-tauri', 'tauri.conf.json');

// Couleurs console
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(version, type) {
  const v = parseVersion(version);

  switch (type) {
    case 'major':
      v.major++;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor++;
      v.patch = 0;
      break;
    case 'patch':
      v.patch++;
      break;
    default:
      throw new Error(`Type de bump invalide: ${type}`);
  }

  return formatVersion(v);
}

function main() {
  const args = process.argv.slice(2);
  const type = args[0];
  const shouldTag = args.includes('--tag');

  if (!type || !['major', 'minor', 'patch'].includes(type)) {
    console.log(`
${colors.cyan('Usage:')} node scripts/bump-version.js <type> [--tag]

${colors.cyan('Types:')}
  patch   0.1.0 → 0.1.1  (corrections de bugs)
  minor   0.1.0 → 0.2.0  (nouvelles fonctionnalités)
  major   0.1.0 → 1.0.0  (breaking changes)

${colors.cyan('Options:')}
  --tag   Crée automatiquement le tag git

${colors.cyan('Exemples:')}
  npm run bump patch
  npm run bump minor --tag
  npm run bump major --tag
`);
    process.exit(1);
  }

  // Lire les versions actuelles
  const packageJson = readJson(PACKAGE_JSON);
  const tauriConf = readJson(TAURI_CONF);

  const currentVersion = packageJson.version;
  const tauriVersion = tauriConf.version;

  // Vérifier synchronisation
  if (currentVersion !== tauriVersion) {
    console.log(colors.red(`⚠ Versions désynchronisées!`));
    console.log(`  package.json:    ${currentVersion}`);
    console.log(`  tauri.conf.json: ${tauriVersion}`);
    console.log(colors.yellow(`\nUtilisation de la version package.json: ${currentVersion}`));
  }

  const newVersion = bumpVersion(currentVersion, type);

  console.log(`\n${colors.cyan('Bump de version:')}`);
  console.log(`  ${currentVersion} → ${colors.green(newVersion)} (${type})\n`);

  // Mettre à jour package.json
  packageJson.version = newVersion;
  writeJson(PACKAGE_JSON, packageJson);
  console.log(`${colors.green('✓')} package.json mis à jour`);

  // Mettre à jour tauri.conf.json
  tauriConf.version = newVersion;
  writeJson(TAURI_CONF, tauriConf);
  console.log(`${colors.green('✓')} tauri.conf.json mis à jour`);

  // Créer le tag git si demandé
  if (shouldTag) {
    try {
      execSync(`git add "${PACKAGE_JSON}" "${TAURI_CONF}"`, { stdio: 'pipe' });
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'pipe' });
      execSync(`git tag v${newVersion}`, { stdio: 'pipe' });

      console.log(`${colors.green('✓')} Commit créé`);
      console.log(`${colors.green('✓')} Tag v${newVersion} créé`);
      console.log(`\n${colors.yellow('Pour publier la release:')}`);
      console.log(`  git push origin main --tags`);
    } catch (error) {
      console.log(colors.red(`\n✗ Erreur git: ${error.message}`));
      console.log(colors.yellow(`\nCommandes manuelles:`));
      console.log(`  git add .`);
      console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
      console.log(`  git tag v${newVersion}`);
      console.log(`  git push origin main --tags`);
    }
  } else {
    console.log(`\n${colors.yellow('Prochaines étapes:')}`);
    console.log(`  git add .`);
    console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`  git tag v${newVersion}`);
    console.log(`  git push origin main --tags`);
    console.log(`\n${colors.cyan('Ou relancez avec --tag pour automatiser:')}`);
    console.log(`  npm run bump ${type} --tag`);
  }

  console.log();
}

main();
