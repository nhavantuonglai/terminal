import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

// --- CẤU HÌNH ---
const CONFIG = {
    SERVER_URL: "https://te-b1id.onrender.com", 
    API_KEY: "87aa8f284fb4f6", 
    RATE_LIMIT_SECONDS: 10
};

export class ChatTerminal {
    constructor() {
        this.socket = null;
        this.currentUser = { ip: '...', city: 'Unknown' };
        this.lastMessageTime = 0;
        this.messageCount = 0;
        this.countdownInterval = null;

        // Cache DOM Elements
        this.elements = {
            input: document.getElementById('message-input'),
            btn: document.getElementById('send-btn'),
            output: document.getElementById('terminal-output'),
            statusDot: document.getElementById('status-dot'),
            connectionText: document.getElementById('connection-text'),
            messageCount: document.getElementById('message-count'),
            statusInfo: document.getElementById('status-info'),
            topStatus: document.getElementById('top-status'),
        };
    }

    async init() {
        // 1. Lấy thông tin user trước
        await this.fetchUserInfo();
        // 2. Sau đó mới kết nối socket
        this.connectSocket();
        // 3. Gắn sự kiện nút bấm
        this.setupEventListeners();
        // 4. Focus vào ô nhập liệu
        this.elements.input.focus();
    }

    // --- XỬ LÝ USER ---
    async fetchUserInfo() {
        try {
            this.elements.statusInfo.textContent = "Fetching IP...";
            const res = await fetch(`https://ipinfo.io/json?token=${CONFIG.API_KEY}`);
            const data = await res.json();
            this.currentUser = { ip: data.ip, city: data.city || 'Unknown' };
            
            this.elements.statusInfo.textContent = `${this.currentUser.ip} • ${this.currentUser.city}`;
            this.elements.topStatus.textContent = "Secure Connection";
        } catch (e) {
            console.error(e);
            this.elements.statusInfo.textContent = 'Anonymous User';
        }
    }

    // --- KẾT NỐI SOCKET ---
    connectSocket() {
        this.socket = io(CONFIG.SERVER_URL, { 
            transports: ['websocket', 'polling'] 
        });

        this.socket.on('connect', () => {
            this.updateStatus('online', 'Connected');
            this.socket.emit('join room', 'global');
        });

        this.socket.on('disconnect', () => {
            this.updateStatus('offline', 'Disconnected');
        });

        this.socket.on('history', (messages) => {
            const welcome = document.querySelector('.welcome-screen');
            this.elements.output.innerHTML = '';
            if (welcome) this.elements.output.appendChild(welcome);
            
            this.messageCount = 0;
            messages.forEach(msg => this.renderMessage(msg));
        });

        this.socket.on('chat message', (msg) => this.renderMessage(msg));
    }

    updateStatus(state, text) {
        if (state === 'online') {
            this.elements.statusDot.style.backgroundColor = '#50fa7b';
            this.elements.statusDot.style.boxShadow = '0 0 5px #50fa7b';
        } else {
            this.elements.statusDot.style.backgroundColor = '#ff5555';
            this.elements.statusDot.style.boxShadow = 'none';
        }
        this.elements.connectionText.textContent = text;
    }

    renderMessage(msg) {
        const div = document.createElement('div');
        div.className = 'message-line';
        
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString('vi-VN', { hour12: false });
        
        div.innerHTML = `
            <span class="timestamp">[${timeStr}]</span>
            <span class="user-info">${msg.ip} (${msg.city}):</span>
            <span class="message-content">${this.escapeHtml(msg.text)}</span>
        `;
        
        this.elements.output.appendChild(div);
        this.elements.output.scrollTop = this.elements.output.scrollHeight;
        
        this.messageCount++;
        this.elements.messageCount.textContent = `${this.messageCount} messages`;
    }

    escapeHtml(text) {
        if (!text) return "";
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // --- HÀM ĐẾM NGƯỢC (SỬA LỖI TẠI ĐÂY) ---
    startCooldown(seconds) {
        const btn = this.elements.btn;
        let remaining = seconds;
        
        btn.disabled = true;
        btn.textContent = `${remaining}`; 
        
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                btn.textContent = `${remaining}`;
            } else {
                clearInterval(this.countdownInterval);
                btn.disabled = false;
                btn.textContent = "Send";
            }
        }, 1000);
    }

    // --- GỬI TIN NHẮN ---
    sendMessage() {
        const text = this.elements.input.value.trim();
        if (!text) return;

        // Check Rate Limit logic
        const now = Date.now();
        const timeSinceLast = (now - this.lastMessageTime) / 1000;

        if (timeSinceLast < CONFIG.RATE_LIMIT_SECONDS) {
            const remaining = Math.ceil(CONFIG.RATE_LIMIT_SECONDS - timeSinceLast);
            this.startCooldown(remaining); // Gọi đúng tên hàm
            return;
        }

        if (this.socket && this.socket.connected) {
            this.socket.emit('chat message', {
                text: text,
                ip: this.currentUser.ip,
                city: this.currentUser.city
            });

            this.elements.input.value = '';
            this.elements.input.focus();
            this.lastMessageTime = now;
            
            // Kích hoạt đếm ngược sau khi gửi
            this.startCooldown(CONFIG.RATE_LIMIT_SECONDS); // Gọi đúng tên hàm
        } else {
            console.log("Socket chưa kết nối hoặc bị ngắt");
            alert("Đang kết nối lại với máy chủ... vui lòng thử lại sau giây lát.");
        }
    }

    setupEventListeners() {
        // Sự kiện Click nút Gửi
        this.elements.btn.addEventListener('click', (e) => {
            e.preventDefault(); // Ngăn hành vi mặc định
            this.sendMessage();
        });

        // Sự kiện nhấn Enter
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
}