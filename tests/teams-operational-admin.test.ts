import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
describe.skipIf(process.platform !== 'win32')('Teams — confirmação administrativa local', () => {
  it.each(['invalid','cancel'])('bloqueia %s antes de PAT e de qualquer acesso remoto', mode => {
    const command=`$ErrorActionPreference='Stop'; function Invoke-RestMethod { throw 'NETWORK_MUST_NOT_RUN' }; function Read-Host { param($Prompt,[switch]$AsSecureString); if($AsSecureString){throw 'PAT_MUST_NOT_RUN'}; return 'CANCELAR' }; try { & ./scripts/teams/admin-hml.ps1 -Action enable-operational -ExpectedCommit '${mode==='invalid'?'invalid':'a'.repeat(40)}' -Reason 'Teste local sem acesso remoto'; exit 9 } catch { if($_.Exception.Message -match 'NETWORK_MUST_NOT_RUN|PAT_MUST_NOT_RUN'){exit 8}; Write-Output 'BLOCKED'; exit 0 }`;
    const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8'});
    expect(result.status).toBe(0); expect(result.stdout).toContain('BLOCKED');
  });
});
