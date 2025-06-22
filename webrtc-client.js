// WebRTC Client for AutoKiwi MCP Server Dashboard
class AutoKiwiWebRTC {
    constructor() {
        this.connection = null;
        this.dataChannel = null;
        this.signalRConnection = null;
        this.isConnected = false;
        this.serverUrl = this.detectServerUrl();
        this.roomId = 'autokiwi-dashboard';
        
        this.init();
    }

    detectServerUrl() {
        // Try to detect if running locally or remotely
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        
        // For GitHub Pages, try to connect to common local ports
        const possiblePorts = [8080, 3000, 8000, 5000];
        return `http://localhost:${possiblePorts[0]}`; // Default to 8080
    }

    async init() {
        try {
            this.updateStatus('connecting');
            
            // Initialize SignalR connection
            await this.initializeSignalR();
            
            // Initialize WebRTC
            await this.initializeWebRTC();
            
            // Try to connect
            await this.connect();
        } catch (error) {
            console.error('WebRTC initialization failed:', error);
            this.updateStatus('disconnected');
            
            // Fallback to HTTP API only
            this.startHttpPolling();
        }
    }

    async initializeSignalR() {
        // Check if SignalR is available
        if (typeof signalR === 'undefined') {
            // Load SignalR dynamically
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@microsoft/signalr@latest/dist/browser/signalr.min.js';
            document.head.appendChild(script);
            
            return new Promise((resolve, reject) => {
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load SignalR'));
            });
        }
    }

    async initializeWebRTC() {
        // Create RTCPeerConnection
        this.connection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Create data channel for code streaming
        this.dataChannel = this.connection.createDataChannel('autokiwi-code', {
            ordered: true
        });

        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.updateStatus('connected');
        };

        this.dataChannel.onmessage = (event) => {
            this.handleCodeStream(event.data);
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.updateStatus('disconnected');
        };

        // Handle incoming data channels
        this.connection.ondatachannel = (event) => {
            const channel = event.channel;
            channel.onmessage = (event) => {
                this.handleCodeStream(event.data);
            };
        };

        // Handle ICE candidates
        this.connection.onicecandidate = (event) => {
            if (event.candidate && this.signalRConnection) {
                this.signalRConnection.invoke('SendIceCandidate', 'server', event.candidate);
            }
        };

        // Handle connection state changes
        this.connection.onconnectionstatechange = () => {
            console.log('Connection state:', this.connection.connectionState);
            if (this.connection.connectionState === 'connected') {
                this.updateStatus('connected');
            } else if (this.connection.connectionState === 'disconnected' || 
                      this.connection.connectionState === 'failed') {
                this.updateStatus('disconnected');
                this.startHttpPolling(); // Fallback
            }
        };
    }

    async connect() {
        try {
            // Try to connect to SignalR hub
            if (typeof signalR !== 'undefined') {
                this.signalRConnection = new signalR.HubConnectionBuilder()
                    .withUrl(`${this.serverUrl}/autokiwi-hub`)
                    .build();

                this.signalRConnection.on('ReceiveOffer', async (senderId, offer) => {
                    await this.connection.setRemoteDescription(offer);
                    const answer = await this.connection.createAnswer();
                    await this.connection.setLocalDescription(answer);
                    this.signalRConnection.invoke('SendAnswer', senderId, answer);
                });

                this.signalRConnection.on('ReceiveAnswer', async (senderId, answer) => {
                    await this.connection.setRemoteDescription(answer);
                });

                this.signalRConnection.on('ReceiveIceCandidate', async (senderId, candidate) => {
                    await this.connection.addIceCandidate(candidate);
                });

                this.signalRConnection.on('CodeUpdate', (data) => {
                    this.handleCodeUpdate(data);
                });

                this.signalRConnection.on('CompilationResult', (data) => {
                    this.handleCompilationResult(data);
                });

                this.signalRConnection.on('StatusUpdate', (data) => {
                    this.handleStatusUpdate(data);
                });

                await this.signalRConnection.start();
                await this.signalRConnection.invoke('JoinRoom', this.roomId);

                // Create offer
                const offer = await this.connection.createOffer();
                await this.connection.setLocalDescription(offer);
                this.signalRConnection.invoke('SendOffer', 'server', offer);

                this.updateStatus('connected');
            } else {
                throw new Error('SignalR not available');
            }
        } catch (error) {
            console.error('WebRTC connection failed:', error);
            this.updateStatus('disconnected');
            this.startHttpPolling();
        }
    }

    startHttpPolling() {
        // Fallback to HTTP API polling
        console.log('Starting HTTP polling fallback');
        
        setInterval(async () => {
            try {
                const response = await fetch(`${this.serverUrl}/api/status`);
                if (response.ok) {
                    const data = await response.json();
                    this.handleStatusUpdate(data);
                    
                    if (!this.isConnected) {
                        this.updateStatus('connected');
                    }
                } else if (this.isConnected) {
                    this.updateStatus('disconnected');
                }
            } catch (error) {
                if (this.isConnected) {
                    this.updateStatus('disconnected');
                }
            }
        }, 3000);
    }

    updateStatus(status) {
        const statusElement = document.getElementById('webrtc-status');
        const connectionStatus = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        if (statusElement) {
            statusElement.className = `webrtc-status webrtc-${status}`;
            
            switch (status) {
                case 'connected':
                    statusElement.textContent = 'WebRTC: Connected';
                    connectionStatus.className = 'connection-status connected';
                    statusText.textContent = 'Connected to AutoKiwi';
                    this.isConnected = true;
                    break;
                case 'connecting':
                    statusElement.textContent = 'WebRTC: Connecting...';
                    connectionStatus.className = 'connection-status disconnected';
                    statusText.textContent = 'Connecting to AutoKiwi...';
                    this.isConnected = false;
                    break;
                case 'disconnected':
                    statusElement.textContent = 'WebRTC: Disconnected';
                    connectionStatus.className = 'connection-status disconnected';
                    statusText.textContent = 'AutoKiwi Offline (HTTP Fallback)';
                    this.isConnected = false;
                    break;
            }
        }
    }

    handleCodeStream(data) {
        try {
            const codeData = JSON.parse(data);
            console.log('Received code stream:', codeData);
            
            if (codeData.code) {
                document.getElementById('code-output').textContent = codeData.code;
                this.updateLivePreview(codeData.code);
            }
        } catch (error) {
            console.error('Error handling code stream:', error);
        }
    }

    handleCodeUpdate(data) {
        console.log('Code update received:', data);
        
        if (data.code) {
            document.getElementById('code-output').textContent = data.code;
            this.updateLivePreview(data.code);
            
            // Add to history
            if (window.addToHistory) {
                window.addToHistory(data.prompt || 'Remote generation', data.code, data.language || 'csharp');
            }
        }
        
        if (data.position) {
            this.updatePosition(data.position);
        }
    }

    handleCompilationResult(data) {
        console.log('Compilation result received:', data);
        
        const statusElement = document.getElementById('compilation-status');
        if (statusElement) {
            statusElement.textContent = data.success ? 'Success' : 'Failed';
        }
        
        if (data.output || data.error) {
            const output = data.success ? 
                `✅ Compilation successful!\n${data.output || ''}` :
                `❌ Compilation failed!\n${data.error || ''}`;
                
            if (window.addChatMessage) {
                window.addChatMessage(`Compilation: ${output}`, 'system');
            }
        }
    }

    handleStatusUpdate(data) {
        console.log('Status update received:', data);
        
        if (data.position) {
            this.updatePosition(data.position);
        }
        
        if (data.memory !== undefined) {
            const memoryElement = document.getElementById('memory-usage');
            if (memoryElement) {
                memoryElement.textContent = Math.round(data.memory / 1024 / 1024) + 'MB';
            }
        }
        
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
        }
    }

    updatePosition(position) {
        const currentPositionElement = document.getElementById('current-position');
        if (currentPositionElement) {
            currentPositionElement.textContent = position;
        }
        
        // Update position buttons
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.position === position);
        });
        
        if (window.currentPosition !== undefined) {
            window.currentPosition = position;
        }
    }

    updateLivePreview(code) {
        if (window.updateLivePreview) {
            window.updateLivePreview(code);
        }
    }

    // API methods for dashboard to use
    async sendSwitchPosition(position, context = '') {
        try {
            const response = await fetch(`${this.serverUrl}/api/switch-position`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ position, context })
            });
            return await response.json();
        } catch (error) {
            console.error('Switch position failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendGenerateCode(prompt, language = 'csharp') {
        try {
            const response = await fetch(`${this.serverUrl}/api/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, language })
            });
            return await response.json();
        } catch (error) {
            console.error('Generate code failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendCompileAndRun(code) {
        try {
            const response = await fetch(`${this.serverUrl}/api/compile-run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            return await response.json();
        } catch (error) {
            console.error('Compile and run failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendChat(message) {
        try {
            const response = await fetch(`${this.serverUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            return await response.json();
        } catch (error) {
            console.error('Chat failed:', error);
            return { response: `Error: ${error.message}` };
        }
    }

    disconnect() {
        if (this.signalRConnection) {
            this.signalRConnection.stop();
        }
        
        if (this.connection) {
            this.connection.close();
        }
        
        this.updateStatus('disconnected');
    }
}

// Initialize WebRTC when the page loads
let autoKiwiWebRTC;

document.addEventListener('DOMContentLoaded', () => {
    autoKiwiWebRTC = new AutoKiwiWebRTC();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoKiwiWebRTC) {
        autoKiwiWebRTC.disconnect();
    }
});
