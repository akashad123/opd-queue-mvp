const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const DB_FILE = "db.json";

// Create db.json if does not exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ tokens: [] }, null, 2));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  createToken(department, priority) {
    const db = loadDB();

    const token = {
      tokenId: uuidv4(),
      department,
      priority: !!priority,
      status: "waiting",
      createdAt: Date.now()
    };

    db.tokens.push(token);
    saveDB(db);

    return token;
  },

  getQueue(department) {
    const db = loadDB();

    return db.tokens
      .filter(t => t.department === department && t.status === "waiting")
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  },

  callNext(department) {
    const db = loadDB();

    const queue = this.getQueue(department);
    if (queue.length === 0) return null;

    const next = queue[0];
    next.status = "in-progress";

    saveDB(db);
    return next;
  },

  updateStatus(tokenId, status) {
    const db = loadDB();

    const token = db.tokens.find(t => t.tokenId === tokenId);
    if (token) {
      token.status = status;
      saveDB(db);
    }
  }
};