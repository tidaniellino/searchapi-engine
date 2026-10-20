# SearchApi.io Clone - Real-Time SERP API & Web Scraping Platform

Engenharia reversa completa da plataforma **[SearchApi.io](https://www.searchapi.io)**, fornecendo uma API unificada para extração estruturada de dados de mecanismos de busca e um **Developer Playground** interativo com visualizador JSON em tempo real e gerador de snippets em cURL, Python, JavaScript, Node.js, Go e PHP.

---

## 🚀 Funcionalidades Implementadas

### 1. Mecanismos de Busca Suportados (`engine`)
| Engine | Descrição | Formato Retornado |
| :--- | :--- | :--- |
| `google` | Busca Web padrão do Google | `organic_results`, `knowledge_graph`, `answer_box`, `related_questions` (PAA), `related_searches`, `sitelinks` |
| `google_news` | Notícias em tempo real | `news_results` com título, link, fonte, data e snippet |
| `google_images` | Busca de imagens | `images_results` com link em alta resolução, dimensões (`width`/`height`), thumbnail e fonte |
| `google_scholar` | Literatura acadêmica | `organic_results` com citações, autores, publicações e links DOI |
| `google_maps` / `google_local` | Locais e pontos de interesse | `local_results` com coordenadas GPS (`latitude`/`longitude`), endereço, categoria, avaliações |
| `google_autocomplete` | Sugestões automáticas | `suggestions` com termos e ranking de relevância |
| `bing` | Microsoft Bing Web | `organic_results` com URLs de destino limpas e decodificadas, sitelinks |
| `youtube` | Vídeos do YouTube | `video_results` com duração, contagem de visualizações, canal e thumbnail |
| `amazon` | Produtos da Amazon | `shopping_results` com ASIN, preços, moeda, avaliações e selo Prime |
| `duckduckgo` | Busca DuckDuckGo | `organic_results` com links limpos diretos |

---

### 2. Endpoints da API REST

#### `GET /api/v1/search`
Endpoint principal para realizar consultas.

**Parâmetros:**
* `q` *(Obrigatório)*: Termo de busca (ex: `q=artificial intelligence`).
* `engine` *(Opcional)*: Mecanismo de busca alvo (padrão: `google`).
* `hl` *(Opcional)*: Código de idioma da interface (ex: `en`, `pt-br`, `es`).
* `gl` *(Opcional)*: Código do país da região (ex: `us`, `br`, `gb`).
* `device` *(Opcional)*: `desktop` ou `mobile`.
* `num` *(Opcional)*: Quantidade de resultados a retornar (padrão: `10`).
* `page` *(Opcional)*: Número da página (padrão: `1`).
* `location` *(Opcional)*: Nome da localização para geo-targeting (ex: `Austin, Texas`).
* `api_key` *(Opcional)*: Chave de API (pode ser enviada na query ou no header `Authorization: Bearer <key>`).

**Exemplo de Resposta JSON:**
```json
{
  "search_metadata": {
    "id": "search_wJsnFlNvdo2oWSeOSUzCJQ",
    "status": "Success",
    "created_at": "2026-10-20T15:26:47.123Z",
    "total_time_taken": 0.38,
    "request_url": "http://localhost:3000/api/v1/search?engine=google&q=chatgpt"
  },
  "search_parameters": {
    "engine": "google",
    "q": "chatgpt",
    "device": "desktop",
    "hl": "en",
    "gl": "us"
  },
  "search_information": {
    "query_displayed": "chatgpt",
    "total_results": 1420000000,
    "detected_location": "United States"
  },
  "organic_results": [
    {
      "position": 1,
      "title": "ChatGPT: Chat, Work, Create & Code with AI",
      "link": "https://chatgpt.com/",
      "domain": "chatgpt.com",
      "displayed_link": "chatgpt.com",
      "snippet": "Use ChatGPT to answer questions, write, create images, complete work, and code—all in one place."
    }
  ]
}
```

#### Autenticação:
A API é protegida por **Chave Mestra Privada** para uso exclusivo do proprietário.
Você pode enviar a chave de duas formas em qualquer requisição:
1. **Query parameter**: `?api_key=SUA_CHAVE_MESTRA`
2. **Authorization header**: `Authorization: Bearer SUA_CHAVE_MESTRA`

A chave é configurada no arquivo `.env` através da variável `API_KEY` (ex: `sk_private_master_daniel_2026`).

#### Outros Endpoints:
- `GET /api/v1/searches/:id`: Recupera uma busca armazenada em cache pelo seu ID.
- `GET /api/v1/searches/:id.html`: Pré-visualização da busca em HTML.
- `GET /api/v1/account`: Informações de status, plano ilimitado e contador de requisições em tempo real.
- `GET /api/v1/locations?q=...`: Busca e resolução geográfica de cidades e coordenadas.
- `GET /api/v1/engines`: Lista de todos os motores disponíveis e seus parâmetros.
- `POST /api/v1/auth/verify`: Validação de chave mestra.

---

### 3. Developer Playground & Interface Web

Acesse no navegador:
```
http://localhost:3000
```

- **Acesso Seguro**: Modal com autenticação por chave mestra com armazenamento local seguro.
- **Seletor de Mecanismo**: Alterne entre Google, News, Imagens, Scholar, Maps, Bing, YouTube e Amazon.
- **Visualizador JSON Interativo**: Destaque de sintaxe, contadores de latência e botão de copiar.
- **Gerador de Código em Tempo Real**: Copie snippets prontos em cURL, Python (`requests`), JavaScript (`fetch`), Node.js (`axios`), Go e PHP.
- **Uso em Tempo Real**: Monitoramento dinâmico de consultas executadas (sem cotas fictícias).

---

### 4. Como Executar

```bash
# Instalar dependências
npm install

# Configurar chave no arquivo .env
API_KEY=sua_chave_secreta

# Iniciar o servidor
node server.js
```
O servidor iniciará na porta `3000`.
