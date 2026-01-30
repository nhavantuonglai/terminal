// chat-server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Sửa đoạn này: Cho phép Front-end Vercel kết nối
const io = new Server(server, {
  cors: { 
    origin: "*", // Hoặc điền domain vercel của bạn vào đây: "https://your-project.vercel.app"
    methods: ["GET", "POST"] 
  }
});

let globalMessages = [];
const MAX_MESSAGES = 500;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join room', (roomName) => {
    socket.join('global');
    socket.emit('history', globalMessages);
  });

  socket.on('chat message', (data) => {
    const { text, ip, city } = data; // Bỏ timestamp từ client để server tự tạo cho chuẩn
    
    const msgData = { 
      text, 
      ip, 
      city, 
      timestamp: new Date().toISOString() // Server tạo timestamp
    };
    
    globalMessages.push(msgData);
    
    if (globalMessages.length > MAX_MESSAGES) {
      globalMessages.shift();
    }

    io.to('global').emit('chat message', msgData);
    console.log(`Message: ${text}`);
  });
});

// QUAN TRỌNG: Sửa port để thích nạp với hosting (Render/Railway/Heroku)
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});