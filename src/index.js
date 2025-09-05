// src/index.js

// Import dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json()); // for parsing application/json

// Dummy in-memory database
let flocks = [
  { id: 1, name: "Flock A", size: 100 },
  { id: 2, name: "Flock B", size: 150 },
];

// Health check route
app.get("/", (req, res) => {
  res.send({ message: "API is alive!" });
});

// GET all flocks
app.get("/flocks", (req, res) => {
  res.send(flocks);
});

// GET a single flock by id
app.get("/flocks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const flock = flocks.find((f) => f.id === id);
  if (!flock) return res.status(404).send({ error: "Flock not found" });
  res.send(flock);
});

// POST create a new flock
app.post("/flocks", (req, res) => {
  const { name, size } = req.body;
  if (!name || !size)
    return res.status(400).send({ error: "Name and size required" });

  const newFlock = { id: flocks.length + 1, name, size };
  flocks.push(newFlock);
  res.status(201).send(newFlock);
});

// PUT update a flock
app.put("/flocks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const flock = flocks.find((f) => f.id === id);
  if (!flock) return res.status(404).send({ error: "Flock not found" });

  const { name, size } = req.body;
  if (name) flock.name = name;
  if (size) flock.size = size;

  res.send(flock);
});

// DELETE a flock
app.delete("/flocks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = flocks.findIndex((f) => f.id === id);
  if (index === -1) return res.status(404).send({ error: "Flock not found" });

  const deleted = flocks.splice(index, 1);
  res.send({ message: "Flock deleted", deleted });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
