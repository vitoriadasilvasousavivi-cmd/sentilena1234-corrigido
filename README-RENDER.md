# Hospital Sentinela — versão corrigida para Render

## Render
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Se usar o `render.yaml`, o Render pode detectar essas configurações.

O servidor usa `process.env.PORT`, escuta em `0.0.0.0` e entrega o frontend pelo mesmo domínio. Por isso, os `fetch()` usam caminhos relativos (`/login`, `/triagem`, etc.) e não `localhost`.

### Usuários de teste
- triagem / 123
- medico / 123
- atendimento / 123

### Rotas principais
`/login`, `/atendimento`, `/pacientes`, `/triagem`, `/triagens`, `/consulta`, `/medicacoes`, `/lista-medicacoes`, `/tv/chamar`, `/tv/chamada`.

Observação: o `db.json` no Render é armazenamento local do serviço e pode ser perdido em novo deploy/restart. Para um projeto escolar/demo isso funciona durante a execução; para persistência real, use um banco externo.
