// chat-server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Lưu trữ tin nhắn global (chỉ có 1 phòng duy nhất)
let globalMessages = [];

// Giới hạn số lượng tin nhắn tối đa để tránh memory leak
const MAX_MESSAGES = 500;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Tự động join global room
  socket.on('join room', (roomName) => {
    socket.join('global');
    
    // Gửi lịch sử tin nhắn
    socket.emit('history', globalMessages);
    
    console.log(`User ${socket.id} joined global chat`);
  });

  // Nhận tin nhắn mới
  socket.on('chat message', (data) => {
    const { text, ip, city, timestamp } = data;
    
    const msgData = { 
      text, 
      ip, 
      city, 
      timestamp: timestamp || new Date().toISOString() 
    };
    
    // Thêm vào danh sách
    globalMessages.push(msgData);
    
    // Giới hạn số lượng tin nhắn (FIFO - First In First Out)
    if (globalMessages.length > MAX_MESSAGES) {
      globalMessages.shift();
    }

    // Broadcast tin nhắn tới tất cả users trong global room
    io.to('global').emit('chat message', msgData);
    
    console.log(`Message from ${ip}: ${text}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Log thông tin khi server start
server.listen(3001, () => {
  console.log('================================');
  console.log('Global Anonymous Chat Server');
  console.log('Port: 3001');
  console.log('Max Messages: ' + MAX_MESSAGES);
  console.log('Rate Limit: Client-side (10s)');
  console.log('================================');
});