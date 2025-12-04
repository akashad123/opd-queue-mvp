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

    // Build the waiting queue from THIS db copy
    const waitingQueue = db.tokens
      .filter(t => t.department === department && t.status === "waiting")
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

    if (waitingQueue.length === 0) return null;

    // First token is the next one
    const nextTokenId = waitingQueue[0].tokenId;

    // Find it in db.tokens and update in-place
    const token = db.tokens.find(t => t.tokenId === nextTokenId);
    if (token) {
      token.status = "in-progress";
      saveDB(db); // persist change
      return token;
    }

    return null;
  },

  updateStatus(tokenId, status) {
    const db = loadDB();

    const token = db.tokens.find(t => t.tokenId === tokenId);
    if (token) {
      token.status = status;
      saveDB(db);
      return token;
    }

    return null;
  }
};
