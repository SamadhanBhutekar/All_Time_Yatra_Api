require("dotenv").config();
const app = require("./index"); // import express app

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Local server running at http://localhost:${PORT}`);
});
