const express = require('express');
const cors = require('cors');
const { webToApp } = require('./index');

const app = express();
app.use(cors());
app.use(express.json());

// Memory-based session storage (Render/Heroku fix - no file system)
let globalSession = null;

app.post('/register', async (req, res) => {
  try {
    // Check if session exists in memory
    if (globalSession && new Date() < new Date(globalSession.expiresAt)) {
      return res.json({ success: true, code: 200, result: globalSession });
    }

    // Register new session
    const result = await webToApp.register();
    if (result.success) {
      globalSession = result.result; // Save to memory
    }
    res.json(result);
  } catch (error) {
    res.json({
      success: false,
      code: error?.response?.status || 500,
      result: { error: error.message || "Registration failed" }
    });
  }
});

app.post('/generate', async (req, res) => {
  const { session, input } = req.body;
  if (!session) {
    return res.json({
      success: false,
      code: 401,
      result: { error: "No session provided" }
    });
  }
  try {
    const result = await webToApp.generate(session, input);
    res.json(result);
  } catch (error) {
    res.json({
      success: false,
      code: error?.response?.status || 500,
      result: { error: error.message || "Generation failed" }
    });
  }
});

app.get('/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    const result = await webToApp.task(taskId);
    res.json(result);
  } catch (error) {
    res.json({
      success: false,
      code: error?.response?.status || 500,
      result: { error: error.message || "Task failed" }
    });
  }
});

// Optional: Root route for health check
app.get('/', (req, res) => {
  res.send('Web to APK Converter API is running! Use /register, /generate, or /task/:id');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
