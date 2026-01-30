const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

// Create Express app
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// JSON body parser
app.use(express.json());

// Load db.json
const dbFilePath = path.join(__dirname, 'db.json');

function loadDb() {
  try {
    const data = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[Server] Error loading db.json:', err.message);
    return {};
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Error saving db.json:', err.message);
  }
}

// REST API endpoints
app.get('/products', (req, res) => {
  const db = loadDb();
  res.json(db.products || []);
});

// Products CRUD
app.post('/products', (req, res) => {
  const db = loadDb();
  const products = db.products || [];
  const id = (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
  const newProduct = { id: String(id), ...req.body };
  products.push(newProduct);
  db.products = products;
  saveDb(db);
  broadcastChange(db);
  res.json(newProduct);
});

app.patch('/products/:id', (req, res) => {
  const db = loadDb();
  const products = db.products || [];
  const idx = products.findIndex(p => String(p.id) === String(req.params.id));
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...req.body };
    db.products = products;
    saveDb(db);
    broadcastChange(db);
    res.json(products[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/products/:id', (req, res) => {
  const db = loadDb();
  const products = db.products || [];
  const filtered = products.filter(p => String(p.id) !== String(req.params.id));
  db.products = filtered;
  saveDb(db);
  broadcastChange(db);
  res.json({ success: true });
});

app.get('/orders', (req, res) => {
  const db = loadDb();
  res.json(db.orders || []);
});

app.get('/orders/:id', (req, res) => {
  const db = loadDb();
  const orders = db.orders || [];
  const order = orders.find(o => String(o.id) === String(req.params.id));
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.put('/orders/:id', (req, res) => {
  const db = loadDb();
  const orders = db.orders || [];
  const idx = orders.findIndex(o => String(o.id) === String(req.params.id));
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], ...req.body };
    db.orders = orders;
    saveDb(db);
    broadcastChange(db);
    res.json(orders[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.patch('/orders/:id', (req, res) => {
  const db = loadDb();
  const orders = db.orders || [];
  const idx = orders.findIndex(o => String(o.id) === String(req.params.id));
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], ...req.body };
    db.orders = orders;
    saveDb(db);
    broadcastChange(db);
    res.json(orders[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/orders', (req, res) => {
  const db = loadDb();
  const orders = db.orders || [];
  const newOrder = {
    id: String((Date.now().toString(36) + Math.random().toString(36).slice(2,6))),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  db.orders = orders;
  saveDb(db);
  broadcastChange(db);
  res.json(newOrder);
});

app.delete('/orders/:id', (req, res) => {
  const db = loadDb();
  const orders = db.orders || [];
  const filtered = orders.filter(o => String(o.id) !== String(req.params.id));
  db.orders = filtered;
  saveDb(db);
  broadcastChange(db);
  res.json({ success: true });
});

app.get('/admins', (req, res) => {
  const db = loadDb();
  const admins = db.admins || [];
  const username = req.query.username;
  const password = req.query.password;
  
  if (username && password) {
    const admin = admins.find(a => a.username === username && a.password === password);
    if (admin) {
      res.json([admin]);
    } else {
      res.json([]);
    }
  } else {
    res.json(admins);
  }
});

// Create HTTP server
const httpServer = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server: httpServer });
const clients = new Set();

function broadcastChange(db) {
  const message = JSON.stringify({
    type: 'dbchange',
    data: db,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('[WebSocket] Error sending to client:', err.message);
        clients.delete(client);
      }
    }
  });
  
  if (clients.size > 0) {
    console.log(`[WebSocket] Change broadcast to ${clients.size} client(s)`);
  }
}

// Watch db.json for external changes
let watchTimeout;
fs.watch(dbFilePath, (eventType, filename) => {
  clearTimeout(watchTimeout);
  watchTimeout = setTimeout(() => {
    try {
      const db = loadDb();
      broadcastChange(db);
      console.log(`[Watch] db.json changed - broadcasting to clients`);
    } catch (err) {
      console.error('[Watch] Error:', err.message);
    }
  }, 300);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log(`[WebSocket] New client connected. Total: ${clients.size + 1}`);
  clients.add(ws);
  
  // Send initial db state
  try {
    const db = loadDb();
    ws.send(JSON.stringify({
      type: 'init',
      data: db,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    console.error('[WebSocket] Error sending init:', err.message);
  }
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total: ${clients.size}`);
  });
  
  ws.on('error', (err) => {
    console.error('[WebSocket] Client error:', err.message);
    clients.delete(ws);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[✓ Server] Started on http://localhost:${PORT}`);
  console.log(`[✓ WebSocket] Ready on ws://localhost:${PORT}`);
  console.log(`[✓ Watch] Monitoring db.json for changes\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  wss.clients.forEach(ws => ws.close());
  httpServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  wss.clients.forEach(ws => ws.close());
  httpServer.close();
  process.exit(0);
});
