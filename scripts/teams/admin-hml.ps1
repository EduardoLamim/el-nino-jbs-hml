param(
  [ValidateSet('report','resolve','replay','disable')][string]$Action = 'report',
  [string]$DeliveryId,
  [ValidateSet('confirmed','dismissed','blocked')][string]$Status = 'confirmed',
  [string]$Reason
)
$ErrorActionPreference = 'Stop'
$payload = @{}
$rpcAction = $Action
if ($Action -in @('resolve','replay')) {
  $parsedId = [guid]::Empty
  if (-not [guid]::TryParse($DeliveryId, [ref]$parsedId) -or $Reason.Trim().Length -lt 10 -or $Reason.Length -gt 500) {
    throw 'Informe DeliveryId válido e justificativa de 10 a 500 caracteres, sem credenciais.'
  }
  $payload = @{ id = $parsedId.ToString(); status = $Status; reason = $Reason }
} elseif ($Action -eq 'disable') { $rpcAction = 'configure'; $payload = @{ mode = 'disabled' } }
$secureToken = Read-Host 'Token administrativo HML (entrada oculta)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $headers = @{ Authorization = 'Bearer ' + [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  $query = 'select jbs_notifications.execute($1,$2::jsonb) as result'
  if ($Action -eq 'disable') {
    # Administrative path independent of the Edge function. While disabled, claim
    # only sweeps expired leases; it cannot send or claim an event.
    $query = "begin; select jbs_notifications.execute('configure','{`"mode`":`"disabled`"}'::jsonb); select jbs_notifications.execute('claim'); commit;"
    $body = @{ query = $query } | ConvertTo-Json -Depth 8
  } else { $body = @{ query = $query; parameters = @($rpcAction, ($payload | ConvertTo-Json -Compress)) } | ConvertTo-Json -Depth 8 }
  try {
    $result = Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/ufeahglxwygvlugfsopi/database/query' -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 30
    $directory = Join-Path $PSScriptRoot '..\..\.codex_work'
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $directory 'teams-hml-admin-result.json') -Encoding UTF8
    Write-Output 'Operação administrativa concluída. Evidência sanitizada em .codex_work/teams-hml-admin-result.json.'
  } catch { throw 'Consulta administrativa HML falhou. Nenhum header, token ou corpo remoto foi exibido; não faça replay sem verificar.' }
} finally {
  $headers = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $secureToken.Dispose()
}
