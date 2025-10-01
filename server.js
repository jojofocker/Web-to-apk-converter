const express = require('express');
const cors = require('cors');
const { webToApp } = require('./index');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/register', async (req, res) => {
  const result = await webToApp.register();
  res.json(result);
});

app.post('/generate', async (req, res) => {
  const { session, input } = req.body;
  const result = await webToApp.generate(session, input);
  res.json(result);
});

app.get('/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const result = await webToApp.task(taskId);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
