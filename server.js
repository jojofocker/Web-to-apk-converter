import express from 'express';
import cors from 'cors';
import { webToApp } from './webToApp.js';

const app = express();
app.use(cors());
app.use(express.json());

// Root route to prevent "Cannot GET /" error
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Web-to-App Maker API is running',
    endpoints: {
      register: 'POST /register',
      generate: 'POST /generate',
      getIcon: 'GET /icon/:name',
    },
  });
});

// Register a new user
app.post('/register', async (req, res) => {
  try {
    const result = await webToApp.register();
    res.status(result.code).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      result: { error: `Server error: ${error.message}` },
    });
  }
});

// Generate an app
app.post('/generate', async (req, res) => {
  try {
    const userSession = await webToApp.register();
    if (!userSession.success) {
      return res.status(userSession.code).json(userSession.result);
    }
    const result = await webToApp.generate(userSession.result, req.body);
    res.status(result.code).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      result: { error: `Server error: ${error.message}` },
    });
  }
});

// Get icon URL
app.get('/icon/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { style } = req.query;
    const result = webToApp.utils.getIcon(name, style);
    res.status(result.code).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      result: { error: `Server error: ${error.message}` },
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
