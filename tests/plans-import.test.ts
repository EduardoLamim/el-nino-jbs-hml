import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('valida importador XLSX offline, segurança, textos integrais e 13 ações TI', () => {
  expect(() => execFileSync(process.env.PYTHON_EXECUTABLE ?? (process.platform === 'win32' ? 'python' : 'python3'), ['tests/plan_import_test.py'], { stdio: 'pipe' })).not.toThrow();
});
