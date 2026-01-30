// chat-server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép mọi nguồn kết nối (không bảo mật theo yêu cầu)
    methods: ["GET", "POST"]
  }
});

// Lưu trữ dữ liệu đơn giản (trong RAM server)
let messageHistory = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Gửi lịch sử chat cũ cho người mới vào
  socket.emit('history', messageHistory);

  // 2. Lắng nghe tin nhắn mới
  socket.on('chat message', (msgData) => {
    // Lưu tin nhắn
    messageHistory.push(msgData);
    
    // Giới hạn lưu trữ 100 tin gần nhất để nhẹ server
    if (messageHistory.length > 100) messageHistory.shift();

    // Gửi tin nhắn đến TẤT CẢ mọi người
    io.emit('chat message', msgData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(3001, () => {
  console.log('Server chat đang chạy tại cổng 3001');
});