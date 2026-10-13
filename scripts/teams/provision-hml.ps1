param([switch]$SyntheticTests, [switch]$RecoverSetup)
$ErrorActionPreference = 'Stop'
if ($SyntheticTests -and $RecoverSetup) { throw 'Recuperação não pode enviar mensagens. Use somente -RecoverSetup após inspeção.' }
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ((Get-Content -LiteralPath (Join-Path $workspace 'supabase\.temp\project-ref') -Raw).Trim() -ne 'ufeahglxwygvlugfsopi') {
  throw 'Projeto vinculado diferente do HML. Nenhuma alteração executada.'
}
# No secrets in arguments, transcript, files, clipboard or terminal output.
$secureToken = Read-Host 'Token administrativo Supabase HML (entrada oculta)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$previousToken = $env:SUPABASE_ACCESS_TOKEN
try {
  $env:SUPABASE_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  Push-Location $workspace
  try {
    $arguments = @('--import', 'tsx', 'scripts/teams/provision.ts')
    if ($SyntheticTests) { $arguments += '--synthetic-tests' }
    if ($RecoverSetup) { $arguments += '--recover-setup' }
    & node @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Provisionamento interrompido. Consulte somente a etapa sanitizada indicada; não repita sem verificar o estado remoto.' }
  } finally { Pop-Location }
} finally {
  $env:SUPABASE_ACCESS_TOKEN = $previousToken
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $secureToken.Dispose()
}
