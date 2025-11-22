import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function getVersion() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let version = 'unknown';

  try {
    const versionPath = path.resolve(__dirname, '..', '..', '.version');
    if (fs.existsSync(versionPath)) {
      version = fs.readFileSync(versionPath, 'utf8').trim();
      if (version === '') {
        version = 'unknown';
      }
    }
  } catch (err) {
    // if it fails, we leave it as "unknown"
  }

  return version;
}
