document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('search-form');
  const engineSelect = document.getElementById('engine-select');
  const queryInput = document.getElementById('query-input');
  const hlInput = document.getElementById('hl-input');
  const glInput = document.getElementById('gl-input');
  const deviceSelect = document.getElementById('device-select');
  const numInput = document.getElementById('num-input');
  const pageInput = document.getElementById('page-input');
  const locationInput = document.getElementById('location-input');
  const btnSubmit = document.getElementById('btn-submit');
  
  const statusBadge = document.getElementById('status-badge');
  const latencyBadge = document.getElementById('latency-badge');
  const resultsCountBadge = document.getElementById('results-count-badge');
  const searchIdBadge = document.getElementById('search-id-badge');
  
  const jsonOutput = document.getElementById('json-output');
  const codeOutput = document.getElementById('code-output');
  const copyBtn = document.getElementById('copy-json-btn');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  
  const tabJson = document.getElementById('tab-json');
  const tabCode = document.getElementById('tab-code');
  const viewJson = document.getElementById('view-json');
  const viewCode = document.getElementById('view-code');
  const langSelect = document.getElementById('code-lang-select');
  
  // Modal elements
  const keysModal = document.getElementById('keys-modal');
  const btnOpenKeys = document.getElementById('btn-open-keys');
  const btnCloseKeys = document.getElementById('btn-close-keys');
  const btnCreateKey = document.getElementById('btn-create-key');
  const keyList = document.getElementById('key-list');
  const activeKeyDisplay = document.getElementById('active-api-key');
  const quotaText = document.getElementById('quota-text');

  let currentSearchData = null;
  let activeApiKey = 'sk_live_demo1234567890abcdef';

  // Syntax highlighter for JSON
  function syntaxHighlight(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }

  // Generate code snippet
  function generateCodeSnippet(lang = 'curl') {
    const engine = engineSelect.value;
    const q = queryInput.value.trim();
    const hl = hlInput.value;
    const gl = glInput.value;
    const device = deviceSelect.value;
    const num = numInput.value;
    const loc = locationInput.value.trim();
    
    const params = new URLSearchParams({
      engine,
      q,
      hl,
      gl,
      device,
      num,
      ...(loc ? { location: loc } : {}),
      api_key: activeApiKey
    });

    const origin = window.location.origin;
    const url = `${origin}/api/v1/search?${params.toString()}`;

    switch (lang) {
      case 'curl':
        return `curl -X GET "${url}"`;

      case 'python':
        return `import requests

url = "${origin}/api/v1/search"
params = {
    "engine": "${engine}",
    "q": "${q}",
    "hl": "${hl}",
    "gl": "${gl}",
    "num": ${num},
    ${loc ? `"location": "${loc}",\n    ` : ''}"api_key": "${activeApiKey}"
}

response = requests.get(url, params=params)
data = response.json()
print(data)`;

      case 'javascript':
        return `// Using native fetch
const url = new URL("${origin}/api/v1/search");
url.search = new URLSearchParams({
  engine: "${engine}",
  q: "${q}",
  hl: "${hl}",
  gl: "${gl}",
  num: "${num}",
  ${loc ? `location: "${loc}",\n  ` : ''}api_key: "${activeApiKey}"
});

const response = await fetch(url);
const data = await response.json();
console.log(data);`;

      case 'nodejs':
        return `const axios = require('axios');

async function runSearch() {
  const response = await axios.get("${origin}/api/v1/search", {
    params: {
      engine: "${engine}",
      q: "${q}",
      hl: "${hl}",
      gl: "${gl}",
      num: ${num},
      ${loc ? `location: "${loc}",\n      ` : ''}api_key: "${activeApiKey}"
    }
  });
  console.log(response.data);
}

runSearch();`;

      case 'go':
        return `package main

import (
    "fmt"
    "io"
    "net/http"
)

func main() {
    url := "${url}"
    resp, err := http.Get(url)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;

      case 'php':
        return `<?php
$url = "${url}";
$response = file_get_contents($url);
$data = json_decode($response, true);
print_r($data);
?>`;

      default:
        return `curl -X GET "${url}"`;
    }
  }

  function updateCodeView() {
    const snippet = generateCodeSnippet(langSelect.value);
    codeOutput.textContent = snippet;
  }

  // Search execution
  async function performSearch() {
    const q = queryInput.value.trim();
    if (!q) {
      alert('Please enter a search query.');
      return;
    }

    const engine = engineSelect.value;
    const hl = hlInput.value;
    const gl = glInput.value;
    const device = deviceSelect.value;
    const num = numInput.value;
    const page = pageInput.value;
    const loc = locationInput.value.trim();

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <svg class="animate-spin" style="width:18px;height:18px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" style="opacity:0.25"></circle>
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style="opacity:0.75"></path>
      </svg>
      Searching SERP...
    `;

    statusBadge.textContent = 'Executing...';
    statusBadge.className = 'stat-pill';
    latencyBadge.textContent = '--';
    resultsCountBadge.textContent = '-- results';

    const params = new URLSearchParams({
      engine,
      q,
      hl,
      gl,
      device,
      num,
      page,
      ...(loc ? { location: loc } : {}),
      api_key: activeApiKey
    });

    const startTime = performance.now();

    try {
      const res = await fetch(`/api/v1/search?${params.toString()}`);
      const data = await res.json();
      const endTime = performance.now();
      const clientLatency = ((endTime - startTime) / 1000).toFixed(2);

      currentSearchData = data;

      if (res.ok) {
        statusBadge.textContent = '200 OK';
        statusBadge.className = 'stat-pill stat-success';
        latencyBadge.textContent = `${data.search_metadata?.total_time_taken || clientLatency}s`;
        
        const count = data.organic_results?.length || data.news_results?.length || data.images_results?.length || data.local_results?.length || data.video_results?.length || data.shopping_results?.length || data.suggestions?.length || 0;
        resultsCountBadge.textContent = `${count} items`;
        searchIdBadge.textContent = data.search_metadata?.id || 'search_live';

        jsonOutput.innerHTML = syntaxHighlight(data);
        updateCodeView();
        refreshAccountQuota();
      } else {
        statusBadge.textContent = `${res.status} Error`;
        statusBadge.className = 'stat-pill stat-danger';
        jsonOutput.innerHTML = syntaxHighlight(data);
      }
    } catch (err) {
      statusBadge.textContent = 'Error';
      statusBadge.className = 'stat-pill stat-danger';
      jsonOutput.textContent = JSON.stringify({ error: 'Network Error', message: err.message }, null, 2);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Send SERP Request
      `;
    }
  }

  // Handle Form Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch();
  });

  // Presets click
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      queryInput.value = pill.getAttribute('data-query');
      if (pill.getAttribute('data-engine')) {
        engineSelect.value = pill.getAttribute('data-engine');
      }
      performSearch();
    });
  });

  // Engine Cards Click
  document.querySelectorAll('.engine-card').forEach(card => {
    card.addEventListener('click', () => {
      const eng = card.getAttribute('data-engine');
      if (eng) {
        engineSelect.value = eng;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        performSearch();
      }
    });
  });

  // Tab switching
  tabJson.addEventListener('click', () => {
    tabJson.classList.add('active');
    tabCode.classList.remove('active');
    viewJson.style.display = 'block';
    viewCode.style.display = 'none';
  });

  tabCode.addEventListener('click', () => {
    tabCode.classList.add('active');
    tabJson.classList.remove('active');
    viewJson.style.display = 'none';
    viewCode.style.display = 'flex';
    updateCodeView();
  });

  langSelect.addEventListener('change', updateCodeView);

  // Copy Buttons
  copyBtn.addEventListener('click', () => {
    if (currentSearchData) {
      navigator.clipboard.writeText(JSON.stringify(currentSearchData, null, 2));
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Copied!';
      setTimeout(() => { copyBtn.innerHTML = originalText; }, 1500);
    }
  });

  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeOutput.textContent);
    const originalText = copyCodeBtn.innerHTML;
    copyCodeBtn.innerHTML = '✓ Copied!';
    setTimeout(() => { copyCodeBtn.innerHTML = originalText; }, 1500);
  });

  // Account / Quota loader
  async function refreshAccountQuota() {
    try {
      const res = await fetch(`/api/v1/account?api_key=${activeApiKey}`);
      const data = await res.json();
      if (data && data.plan_searches_limit) {
        quotaText.textContent = `${data.searches_this_month} / ${data.plan_searches_limit} searches`;
      }
    } catch(e) {}
  }

  // Load API keys list
  async function loadApiKeys() {
    try {
      const res = await fetch('/api/v1/api-keys');
      const keys = await res.json();
      keyList.innerHTML = '';
      keys.forEach(k => {
        const item = document.createElement('div');
        item.className = 'key-item';
        item.innerHTML = `
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:#fff;">${k.name}</div>
            <div class="key-value">${k.key}</div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Used: ${k.requestsUsed} requests • ${k.plan}</div>
          </div>
          <button class="btn-copy" onclick="navigator.clipboard.writeText('${k.key}'); alert('Key copied to clipboard!');">Copy</button>
        `;
        keyList.appendChild(item);
      });
    } catch(e) {}
  }

  btnOpenKeys.addEventListener('click', () => {
    loadApiKeys();
    keysModal.classList.add('open');
  });

  btnCloseKeys.addEventListener('click', () => {
    keysModal.classList.remove('open');
  });

  keysModal.addEventListener('click', (e) => {
    if (e.target === keysModal) keysModal.classList.remove('open');
  });

  btnCreateKey.addEventListener('click', async () => {
    const keyName = prompt('Enter a name for this API key:', 'Production Service');
    if (!keyName) return;
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName, plan: 'Developer' })
      });
      const newKey = await res.json();
      activeApiKey = newKey.key;
      activeKeyDisplay.textContent = activeApiKey;
      loadApiKeys();
      refreshAccountQuota();
      alert(`API Key created: ${newKey.key}`);
    } catch(e) {
      alert('Error creating API key');
    }
  });

  // Initial load
  refreshAccountQuota();
  performSearch();
});
