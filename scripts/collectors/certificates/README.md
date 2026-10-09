# Cadeia pública de Blumenau

O servidor entrega somente o certificado leaf. Os dois intermediários em
`blumenau-intermediates.pem` completam a cadeia até USERTrust, já confiável pelo Node.
Não contêm chave privada. Não são instalados no sistema ou em outros coletores.
Hostname, validade, assinatura, raiz e rejeição de cadeias parciais continuam verificados.

Origem: [hierarquia oficial Sectigo](https://www.sectigo.com/knowledge-base/detail/Sectigo-new-Public-Roots-and-Issuing-CAs-Hierarchy).
Arquivos públicos AIA obtidos em 08/10/2026:

- http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt
- http://crt.sectigo.com/SectigoPublicServerAuthenticationRootR46_USERTrust.crt

Os downloads AIA não são usados como âncoras novas: assinaturas foram verificadas
até a raiz embutida do Node e o leaf validado com OpenSSL `verify -untrusted`,
incluindo hostname. Os testes verificam novamente a cadeia criptográfica.
Fingerprint SHA-256 DV R36: `8C54C334B66BA4E426772AF4A3F9136C19A1AEC729FDB28C535C07A5A4EF22E0`.
Fingerprint SHA-256 R46 cross: `92F351BF3D54164DFA8DD8F9E1139D3150349786485D2B9EECD00E2971C1E6C5`.

Solução definitiva no provedor: servir o fullchain correto. Em eventual troca de
emissor, revisar esta cadeia e os testes; nunca desabilitar TLS para manter a coleta.
