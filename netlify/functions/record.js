const https = require('https');
const TOKEN = process.env.GH_TOKEN || '';

function ghReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com', path, method,
      headers: { 'User-Agent': 'Netlify', 'Authorization': 'token ' + TOKEN, 'Content-Type': 'application/json' }
    };
    if (body) { const b = JSON.stringify(body); opts.headers['Content-Length'] = Buffer.byteLength(b, 'utf8'); }
    const req = https.request(opts, res => {
      let data = ''; res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod === 'GET') {
    try {
      const r = await ghReq('GET', '/repos/Ann277-dev/lottery-data/contents/data.json');
      if (r.status === 200 && r.body.content) {
        const data = JSON.parse(Buffer.from(r.body.content, 'base64').toString('utf8'));
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ records: [] }) };
    } catch(e) { return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }; }
  }
  if (event.httpMethod === 'POST') {
    try {
      const record = JSON.parse(event.body);
      record.time = record.time || new Date().toISOString();
      const r = await ghReq('GET', '/repos/Ann277-dev/lottery-data/contents/data.json');
      let data = { records: [] }, sha = null;
      if (r.status === 200 && r.body.content) { data = JSON.parse(Buffer.from(r.body.content, 'base64').toString('utf8')); sha = r.body.sha; }
      data.records.push(record);
      if (data.records.length > 500) data.records = data.records.slice(-500);
      const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
      await ghReq('PUT', '/repos/Ann277-dev/lottery-data/contents/data.json', { message: 'record', content: b64, sha });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, total: data.records.length }) };
    } catch(e) { return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }; }
  }
  return { statusCode: 404, headers, body: 'Not found' };
};
