const store = require("../db/datastore");

exports.createToken = (req, res) => {
  const { department, priority } = req.body;

  if (!department) {
    return res.status(400).json({ error: "Department required" });
  }

  const token = store.createToken(department, priority);
  return res.json(token);
};

exports.getQueue = (req, res) => {
  const { department } = req.query;

  if (!department) {
    return res.status(400).json({ error: "Department required" });
  }

  const queue = store.getQueue(department);
  return res.json(queue);
};

exports.callNext = (req, res) => {
  const { department } = req.body;

  if (!department) {
    return res.status(400).json({ error: "Department required" });
  }

  const next = store.callNext(department);
  return res.json(next || { message: "No waiting tokens" });
};

exports.updateStatus = (req, res) => {
  const { tokenId, status } = req.body;

  if (!tokenId || !status) {
    return res.status(400).json({ error: "Token ID and status required" });
  }

  store.updateStatus(tokenId, status);
  return res.json({ success: true });
};