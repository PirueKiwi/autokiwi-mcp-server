// AutoKiwi MCP Server Dashboard - Production Version
class AutoKiwiDashboard {
    constructor() {
        this.serverUrl = 'http://localhost:5001';
        this.isConnected = false;
        this.currentPosition = 'Generator';
        this.history = [];
        this.chatHistory = [];
        
        this.initializeUI();
        this.loadStoredSettings();
    }

    initializeUI() {
        // Set up Enter key handlers
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        document.getElementById('codePrompt').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.generateCode();
            }
        });

        document.getElementById('serverUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.connectToServer();
            }
        });

        // Try to auto-connect if on localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setTimeout(() => this.connectToServer(), 1000);
        }
    }

    loadStoredSettings() {
        const storedUrl = localStorage.getItem('autokiwi-server-url');
        const storedHistory = localStorage.getItem('autokiwi-history');
        const storedChatHistory = localStorage.getItem('autokiwi-chat-history');

        if (storedUrl) {
            document.getElementById('serverUrl').value = storedUrl;
            this.serverUrl = storedUrl;
        }

        if (storedHistory) {
            try {
                this.history = JSON.parse(storedHistory);
                this.updateHistoryDisplay();
            } catch (e) {
                console.warn('Failed to load stored history:', e);
            }
        }

        if (storedChatHistory) {
            try {
                this.chatHistory = JSON.parse(storedChatHistory);
                this.updateChatDisplay();
            } catch (e) {
                console.warn('Failed to load stored chat history:', e);
            }
        }
    }

    saveSettings() {
        localStorage.setItem('autokiwi-server-url', this.serverUrl);
        localStorage.setItem('autokiwi-history', JSON.stringify(this.history.slice(-20))); // Keep last 20 items
        localStorage.setItem('autokiwi-chat-history', JSON.stringify(this.chatHistory.slice(-20))); // Keep last 20 messages
    }

    async connectToServer() {
        const urlInput = document.getElementById('serverUrl');
        this.serverUrl = urlInput.value.trim();
        
        if (!this.serverUrl) {
            this.showError('Please enter a server URL');
            return;
        }

        // Ensure URL has protocol
        if (!this.serverUrl.startsWith('http://') && !this.serverUrl.startsWith('https://')) {
            this.serverUrl = 'http://' + this.serverUrl;
            urlInput.value = this.serverUrl;
        }

        this.updateConnectionStatus('connecting', 'Connecting...');

        try {
            const response = await this.makeApiCall('/status');
            if (response) {
                this.isConnected = true;
                this.updateConnectionStatus('connected', `Connected to ${this.serverUrl}`);
                this.showSuccess('Successfully connected to AutoKiwi MCP Server!');
                this.saveSettings();
                
                // Get initial status
                this.refreshStatus();
            }
        } catch (error) {
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', `Failed to connect: ${error.message}`);
            this.showError(`Connection failed: ${error.message}`);
        }
    }

    disconnectFromServer() {
        this.isConnected = false;
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.addToHistory('system', 'Disconnected from server');
    }

    updateConnectionStatus(status, message) {
        const indicator = document.getElementById('connectionIndicator');
        const text = document.getElementById('connectionText');
        
        indicator.className = `status-indicator status-${status}`;
        text.textContent = message;
    }

    async makeApiCall(endpoint, options = {}) {
        if (!this.serverUrl) {
            throw new Error('No server URL configured');
        }

        const url = this.serverUrl + endpoint;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors',
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    }

    async refreshStatus() {
        if (!this.isConnected) return;

        try {
            const status = await this.makeApiCall('/status');
            // Update UI with status information
            console.log('Server status:', status);
        } catch (error) {
            console.error('Failed to refresh status:', error);
        }
    }

    async switchPosition(position) {
        if (!this.isConnected) {
            this.showError('Please connect to server first');
            return;
        }

        try {
            const response = await this.makeApiCall('/switch-position', {
                method: 'POST',
                body: JSON.stringify({ position: position })
            });

            this.currentPosition = position;
            this.updatePositionButtons();
            this.addToHistory('position_switch', `Switched to ${position} mode`);
            this.showSuccess(`Switched to ${position} mode`);
        } catch (error) {
            this.showError(`Failed to switch position: ${error.message}`);
        }
    }

    updatePositionButtons() {
        const buttons = document.querySelectorAll('.position-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.textContent === this.currentPosition);
        });
    }

    async generateCode() {
        const prompt = document.getElementById('codePrompt').value.trim();
        const language = document.getElementById('language').value;
        const projectType = document.getElementById('projectType').value;

        if (!prompt) {
            this.showError('Please enter a code generation prompt');
            return;
        }

        if (!this.isConnected) {
            this.showError('Please connect to server first');
            return;
        }

        try {
            const response = await this.makeApiCall('/generate-code', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: prompt,
                    language: language,
                    project_type: projectType
                })
            });

            const codeOutput = document.getElementById('generatedCode');
            codeOutput.textContent = response.code || response;
            
            this.addToHistory('code_generation', `Generated ${language} code: ${prompt.substring(0, 50)}...`);
            this.showSuccess('Code generated successfully!');
        } catch (error) {
            this.showError(`Code generation failed: ${error.message}`);
        }
    }

    async compileAndRun() {
        const code = document.getElementById('generatedCode').textContent;
        
        if (!code || code === 'Generated code will appear here...') {
            this.showError('No code to compile. Generate code first.');
            return;
        }

        if (!this.isConnected) {
            this.showError('Please connect to server first');
            return;
        }

        try {
            const response = await this.makeApiCall('/compile-run', {
                method: 'POST',
                body: JSON.stringify({ code: code })
            });

            const outputElement = document.getElementById('executionOutput');
            outputElement.textContent = response.output || response.error || response;
            
            if (response.success) {
                this.addToHistory('code_execution', 'Code compiled and executed successfully');
                this.showSuccess('Code executed successfully!');
            } else {
                this.addToHistory('code_execution', 'Code execution failed');
                this.showError('Code execution failed');
            }
        } catch (error) {
            this.showError(`Compilation failed: ${error.message}`);
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addChatMessage('user', message);
        input.value = '';

        if (!this.isConnected) {
            this.addChatMessage('assistant', 'Please connect to the server first to chat with AutoKiwi.');
            return;
        }

        try {
            const response = await this.makeApiCall('/chat', {
                method: 'POST',
                body: JSON.stringify({ message: message })
            });

            this.addChatMessage('assistant', response.response || response);
            this.addToHistory('chat', `Chat: ${message.substring(0, 30)}...`);
        } catch (error) {
            this.addChatMessage('assistant', `Error: ${error.message}`);
        }
    }

    addChatMessage(sender, message) {
        this.chatHistory.push({ sender, message, timestamp: new Date() });
        this.updateChatDisplay();
        this.saveSettings();
    }

    updateChatDisplay() {
        const chatContainer = document.getElementById('chatMessages');
        chatContainer.innerHTML = '';

        this.chatHistory.forEach(chat => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${chat.sender}`;
            messageDiv.innerHTML = `<strong>${chat.sender === 'user' ? 'You' : 'AutoKiwi'}:</strong> ${chat.message}`;
            chatContainer.appendChild(messageDiv);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    addToHistory(action, description) {
        this.history.unshift({
            action,
            description,
            timestamp: new Date().toLocaleString()
        });
        
        // Keep only last 50 items
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }
        
        this.updateHistoryDisplay();
        this.saveSettings();
    }

    updateHistoryDisplay() {
        const historyElement = document.getElementById('historyOutput');
        if (this.history.length === 0) {
            historyElement.innerHTML = 'No history yet...';
            return;
        }

        historyElement.innerHTML = this.history.map(item => `
            <div class="history-item">
                <div class="timestamp">${item.timestamp}</div>
                <div class="action">${item.action.replace('_', ' ').toUpperCase()}</div>
                <div>${item.description}</div>
            </div>
        `).join('');
    }

    clearOutput() {
        document.getElementById('generatedCode').textContent = 'Generated code will appear here...';
        document.getElementById('executionOutput').textContent = 'Execution output will appear here...';
        this.addToHistory('clear', 'Cleared output areas');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;

        // Insert after connection status
        const connectionStatus = document.querySelector('.connection-status');
        connectionStatus.parentNode.insertBefore(messageDiv, connectionStatus.nextSibling);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global functions for button clicks
let dashboard;

function connectToServer() {
    dashboard.connectToServer();
}

function disconnectFromServer() {
    dashboard.disconnectFromServer();
}

function switchPosition(position) {
    dashboard.switchPosition(position);
}

function generateCode() {
    dashboard.generateCode();
}

function compileAndRun() {
    dashboard.compileAndRun();
}

function sendChatMessage() {
    dashboard.sendChatMessage();
}

function clearOutput() {
    dashboard.clearOutput();
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new AutoKiwiDashboard();
});
