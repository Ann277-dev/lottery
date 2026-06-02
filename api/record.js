const https = require('https');

const TOKEN = process.env.GH_TOKEN || '';
const REPO = 'Ann277-dev/lottery-data';
const FILE = 'data.json';

function ghReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: { 'User-Agent': 'Vercel', 'Authorization': 'token ' + TOKEN, 'Content-Type': 'application/json' }
    };
    if (body) {
      const b = JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(b, 'utf8');
    }
    const req = https.request(opts, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sendJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.statusCode = code || 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(body);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  if (req.method === 'GET') {
    try {
      const r = await ghReq('GET', '/repos/' + REPO + '/contents/' + FILE);
      if (r.status === 200 && r.body && r.body.content) {
        const raw = Buffer.from(r.body.content, 'base64').toString('utf8');
        const data = JSON.parse(raw);
        sendJSON(res, 200, data);
      } else {
        const init = { records: [] };
        const b64 = Buffer.from(JSON.stringify(init), 'utf8').toString('base64');
        await ghReq('PUT', '/repos/' + REPO + '/contents/' + FILE, { message: 'init', content: b64 });
        sendJSON(res, 200, init);
      }
    } catch(e) { sendJSON(res, 500, { error: e.message }); }
    return;
  }

  if (req.method === 'POST') {
    try {
      const record = req.body;
      if (!record || !record.results) { sendJSON(res, 400, { error: 'invalid' }); return; }
      record.time = record.time || new Date().toISOString();

      const r1 = await ghReq('GET', '/repos/' + REPO + '/contents/' + FILE);
      let data = { records: [] };
      let sha = null;
      if (r1.status === 200 && r1.body && r1.body.content) {
        data = JSON.parse(Buffer.from(r1.body.content, 'base64').toString('utf8'));
        sha = r1.body.sha;
      }
      data.records.push(record);
      if (data.records.length > 500) data.records = data.records.slice(-500);
      const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
      await ghReq('PUT', '/repos/' + REPO + '/contents/' + FILE, { message: 'record', content: b64, sha: sha });
      sendJSON(res, 200, { ok: true, total: data.records.length });
    } catch(e) { sendJSON(res, 500, { error: e.message }); }
  }
};
