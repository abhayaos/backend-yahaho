const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server daudi rako xa chinta linu prdaina!');
});

app.get('/server-ko-halkhabar', (req, res) => {
  res.send('Thikai xu raja timro bhana esoo maya lage ma malai dm gara hai 9808370638 whatsapp number ei ho');
});

// 404 handler must be last
app.get('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: "404 Not Found"
  });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});