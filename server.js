const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'lottery_data.json');
const PORT = 4000;

// 读取数据
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) {}
  return { records: [] };
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// CORS + JSON 响应
function json(res, obj, code = 200) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj, null, 2));
}

// 管理后台 HTML
function getAdminHTML(data) {
  const records = data.records;
  const total = records.length;
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.time && r.time.startsWith(today));
  const todayTotal = todayRecords.length;

  // 统计
  const prizeCount = {};  // 抽到的各奖品次数
  const pickCount = {};   // 选择的各奖品次数
  records.forEach(r => {
    r.results.forEach(p => {
      prizeCount[p.name] = (prizeCount[p.name] || 0) + 1;
    });
    if (r.picked) {
      pickCount[r.picked.name] = (pickCount[r.picked.name] || 0) + 1;
    }
  });

  // 最近20条
  const recent = [...records].reverse().slice(0, 20);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>抽奖管理后台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f5;padding:20px}
h1{text-align:center;margin-bottom:20px;color:#333}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:14px;padding:20px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06)}
.card .num{font-size:42px;font-weight:800;color:#7c5cfc}
.card .label{font-size:13px;color:#888;margin-top:4px}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;margin-bottom:24px}
.chart{background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.06)}
.chart h3{margin-bottom:14px;color:#444;font-size:16px}
.bar{margin-bottom:10px;display:flex;align-items:center;gap:10px}
.bar .name{width:120px;text-align:right;font-size:14px;flex-shrink:0}
.bar .track{flex:1;height:26px;background:#f0f0f0;border-radius:13px;overflow:hidden}
.bar .fill{height:100%;border-radius:13px;background:linear-gradient(90deg,#7c5cfc,#a18cd1);transition:width .5s;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;font-size:12px;color:#fff;font-weight:600;min-width:40px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06)}
th,td{padding:10px 14px;text-align:left;font-size:13px}
th{background:#7c5cfc;color:#fff;font-weight:600}
td{border-bottom:1px solid #f0f0f0}
tr:last-child td{border-bottom:none}
.picked-badge{background:#fff3cd;color:#b8860b;padding:2px 8px;border-radius:10px;font-size:12px}
.refresh{text-align:center;margin-top:20px}
.refresh button{padding:8px 24px;border-radius:20px;border:none;background:#7c5cfc;color:#fff;font-size:14px;cursor:pointer;font-family:inherit}
.refresh span{color:#888;font-size:12px;margin-left:10px}
</style>
</head>
<body>
<h1>📊 抽奖管理后台</h1>

<div class="cards">
  <div class="card"><div class="num">${total}</div><div class="label">👥 总参与人数</div></div>
  <div class="card"><div class="num">${todayTotal}</div><div class="label">📅 今日参与</div></div>
  <div class="card"><div class="num">${records.length * 3}</div><div class="label">🎰 总抽奖次数</div></div>
  <div class="card"><div class="num">${Object.values(pickCount).reduce((a,b)=>a+b,0)}</div><div class="label">✅ 已领取</div></div>
</div>

<div class="charts">
  <div class="chart">
    <h3>🎰 抽中奖品分布（共 ${records.length * 3} 次）</h3>
    ${renderBars(prizeCount, 3 * Math.max(total, 1))}
  </div>
  <div class="chart">
    <h3>✅ 选择领取分布</h3>
    ${renderBars(pickCount, Math.max(Object.values(pickCount).reduce((a,b)=>a+b,0), 1))}
  </div>
</div>

<div class="chart">
  <h3>📜 最近抽奖记录</h3>
  <table>
    <tr><th>时间</th><th>抽奖结果</th><th>已选</th></tr>
    ${recent.map(r => `
      <tr>
        <td>${r.time || '-'}</td>
        <td>${r.results.map(p => p.emoji + ' ' + p.name).join(' &nbsp;|&nbsp; ')}</td>
        <td>${r.picked ? `<span class="picked-badge">✅ ${r.picked.emoji} ${r.picked.name}</span>` : '<span style="color:#aaa">未选</span>'}</td>
      </tr>
    `).join('')}
  </table>
</div>

<div class="refresh">
  <button onclick="location.reload()">🔄 刷新数据</button>
  <span>上次更新：${new Date().toLocaleString('zh-CN')}</span>
</div>

<script>
setTimeout(() => location.reload(), 30000);
</script>
</body>
</html>`;
}

function renderBars(counts, max) {
  const entries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  if (entries.length === 0) return '<p style="color:#aaa;text-align:center;">暂无数据</p>';
  return entries.map(([name, count]) => {
    const pct = Math.round(count / max * 100);
    return `<div class="bar">
      <span class="name">${name}</span>
      <div class="track"><div class="fill" style="width:${Math.max(pct, 3)}%">${count}</div></div>
    </div>`;
  }).join('');
}

// MIME 类型
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

// 启动服务器
const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  // 管理后台页面
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin')) {
    const data = loadData();
    const html = getAdminHTML(data);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // API: 上传抽奖记录
  if (req.method === 'POST' && url.pathname === '/api/record') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const record = JSON.parse(body);
        if (!record.results || !Array.isArray(record.results)) throw new Error('Invalid');
        record.time = record.time || new Date().toISOString();
        const data = loadData();
        data.records.push(record);
        saveData(data);
        json(res, { ok: true, total: data.records.length });
      } catch(e) {
        json(res, { ok: false, error: e.message }, 400);
      }
    });
    return;
  }

  // API: 获取所有记录
  if (req.method === 'GET' && url.pathname === '/api/records') {
    const data = loadData();
    json(res, data);
    return;
  }

  // API: 清空数据
  if (req.method === 'POST' && url.pathname === '/api/clear') {
    saveData({ records: [] });
    json(res, { ok: true });
    return;
  }

  // 静态文件
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  if (MIME[ext] && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext], 'Access-Control-Allow-Origin': '*' });
    res.end(content);
    return;
  }

  // 404
  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`📊 Admin dashboard: http://localhost:${PORT}`);
  console.log(`📡 API endpoint:   http://localhost:${PORT}/api/record`);
});
