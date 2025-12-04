const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const tokenController = require("./controllers/tokens");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ROUTES
app.post("/api/token/create", tokenController.createToken);
app.get("/api/queue", tokenController.getQueue);
app.post("/api/token/next", tokenController.callNext);
app.post("/api/token/update", tokenController.updateStatus);

// START SERVER
const PORT = 5000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});