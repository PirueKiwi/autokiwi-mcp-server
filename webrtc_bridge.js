// WebRTC Bridge for Claude 4 Autonomous Code Streaming
class Claude4WebRTCBridge {
    constructor() {
        this.rtcConnection = null;
        this.dataChannel = null;
        this.mcpServerUrl = 'http://localhost:5001';
        this.isConnected = false;
        this.autonomousEnabled = false;
        this.codeBuffer = [];
        this.lastCodeHash = '';
        
        this.init();
    }

    async init() {
        console.log('🤖 Claude 4 WebRTC Bridge initializing...');
        
        // Setup WebRTC connection
        await this.setupWebRTC();
        
        // Connect to AutoKiwi MCP server
        await this.connectToMCP();
        
        // Start autonomous monitoring
        this.startAutonomousMonitoring();
        
        console.log('✅ Claude 4 Bridge ready for autonomous operation!');
    }

    async setupWebRTC() {
        this.rtcConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Create data channel for code streaming
        this.dataChannel = this.rtcConnection.createDataChannel('codeStream', {
            ordered: true,
            maxPacketLifeTime: 3000
        });

        this.dataChannel.onopen = () => {
            console.log('📡 WebRTC data channel opened');
            this.isConnected = true;
            this.onConnectionReady();
        };

        this.dataChannel.onmessage = (event) => {
            this.handleIncomingCodeStream(event.data);
        };

        this.dataChannel.onerror = (error) => {
            console.error('❌ WebRTC error:', error);
            this.handleConnectionError(error);
        };

        // ICE candidate handling
        this.rtcConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendICECandidate(event.candidate);
            }
        };

        console.log('🔗 WebRTC connection setup complete');
    }

    async connectToMCP() {
        try {
            // Enable autonomous mode in QuickReactiveMcp
            const response = await fetch(`${this.mcpServerUrl}/api/enable-autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mode: 'full',
                    webrtc_enabled: true,
                    code_streaming: true
                })
            });

            if (response.ok) {
                this.autonomousEnabled = true;
                console.log('🤖 Autonomous mode enabled in MCP server');
            }
        } catch (error) {
            console.warn('⚠️ MCP server not available, running in standalone mode');
        }
    }

    onConnectionReady() {
        // Notify dashboard that Claude 4 autonomous bridge is ready
        this.broadcastEvent({
            type: 'claude4_bridge_ready',
            timestamp: new Date().toISOString(),
            capabilities: [
                'autonomous_code_monitoring',
                'real_time_analysis',
                'proactive_debugging',
                'intelligent_position_switching'
            ]
        });
    }

    startAutonomousMonitoring() {
        // Monitor GitHub repository changes
        this.startGitHubMonitoring();
        
        // Monitor local code changes
        this.startLocalCodeMonitoring();
        
        // Monitor compilation and runtime events
        this.startCompilationMonitoring();
        
        // Start health check loop
        this.startHealthMonitoring();
        
        console.log('👁️ Autonomous monitoring systems activated');
    }

    startGitHubMonitoring() {
        // WebSocket connection to GitHub Events API
        setInterval(async () => {
            try {
                const response = await fetch('https://api.github.com/repos/piruekiwi/autokiwi-mcp-server/events');
                const events = await response.json();
                
                for (const event of events.slice(0, 5)) {
                    if (event.type === 'PushEvent') {
                        await this.analyzeGitHubPush(event);
                    }
                }
            } catch (error) {
                console.warn('GitHub monitoring error:', error.message);
            }
        }, 10000); // Check every 10 seconds
    }

    async analyzeGitHubPush(pushEvent) {
        const commits = pushEvent.payload.commits || [];
        
        for (const commit of commits) {
            // Analyze commit for potential issues
            const analysis = this.analyzeCommitMessage(commit.message);
            
            if (analysis.hasIssues) {
                await this.triggerAutonomousReaction({
                    type: 'github_issue_detected',
                    issue: analysis.issueType,
                    commit: commit.sha.substring(0, 7),
                    message: commit.message,
                    author: commit.author.name
                });
            }
        }
    }

    analyzeCommitMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Pattern matching for issue detection
        if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
            return { hasIssues: true, issueType: 'bug_fix' };
        }
        if (lowerMessage.includes('error') || lowerMessage.includes('exception')) {
            return { hasIssues: true, issueType: 'runtime' };
        }
        if (lowerMessage.includes('test') && lowerMessage.includes('fail')) {
            return { hasIssues: true, issueType: 'test' };
        }
        if (lowerMessage.includes('performance') || lowerMessage.includes('slow')) {
            return { hasIssues: true, issueType: 'performance' };
        }
        if (lowerMessage.includes('wip') || lowerMessage.includes('todo')) {
            return { hasIssues: true, issueType: 'incomplete' };
        }
        
        return { hasIssues: false };
    }

    startLocalCodeMonitoring() {
        // Monitor code changes via WebRTC data channel
        setInterval(() => {
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
                // Request latest code state
                this.dataChannel.send(JSON.stringify({
                    type: 'request_code_state',
                    timestamp: new Date().toISOString()
                }));
            }
        }, 2000);
    }

    startCompilationMonitoring() {
        // Monitor for compilation events
        setInterval(async () => {
            try {
                const response = await fetch(`${this.mcpServerUrl}/api/compilation-status`);
                if (response.ok) {
                    const status = await response.json();
                    
                    if (status.hasErrors) {
                        await this.triggerAutonomousReaction({
                            type: 'compilation_error',
                            errors: status.errors,
                            warnings: status.warnings,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            } catch (error) {
                // Server not available, continue monitoring
            }
        }, 3000);
    }

    startHealthMonitoring() {
        setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Every 30 seconds
    }

    async performHealthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            webrtc_connected: this.isConnected,
            autonomous_enabled: this.autonomousEnabled,
            memory_usage: this.getMemoryUsage(),
            connection_quality: this.getConnectionQuality(),
            processed_events: this.codeBuffer.length
        };

        // Broadcast health status
        this.broadcastEvent({
            type: 'health_check',
            data: health
        });

        // Auto-healing if issues detected
        if (!this.isConnected && this.autonomousEnabled) {
            console.log('🔧 Auto-healing: Attempting to reconnect...');
            await this.attemptReconnection();
        }
    }

    handleIncomingCodeStream(data) {
        try {
            const codeEvent = JSON.parse(data);
            
            // Add to code buffer for analysis
            this.codeBuffer.push({
                ...codeEvent,
                received_at: new Date().toISOString()
            });

            // Keep buffer size manageable
            if (this.codeBuffer.length > 100) {
                this.codeBuffer.shift();
            }

            // Analyze code change for issues
            this.analyzeCodeChange(codeEvent);
            
        } catch (error) {
            console.error('Error processing code stream:', error);
        }
    }

    async analyzeCodeChange(codeEvent) {
        const { code, action, language, file } = codeEvent;
        
        // Hash comparison for change detection
        const codeHash = this.hashCode(code);
        if (codeHash === this.lastCodeHash) return;
        
        this.lastCodeHash = codeHash;

        // Static code analysis
        const issues = this.performStaticAnalysis(code, language);
        
        if (issues.length > 0) {
            for (const issue of issues) {
                await this.triggerAutonomousReaction({
                    type: 'static_analysis_issue',
                    issue_type: issue.type,
                    severity: issue.severity,
                    message: issue.message,
                    code_snippet: code.substring(0, 200),
                    file: file,
                    line: issue.line
                });
            }
        }

        // Pattern recognition for incomplete code
        if (this.detectIncompleteCode(code)) {
            await this.triggerAutonomousReaction({
                type: 'incomplete_code',
                code_snippet: code,
                suggestions: this.generateCompletionSuggestions(code)
            });
        }
    }

    performStaticAnalysis(code, language) {
        const issues = [];
        
        if (language === 'csharp' || language === 'cs') {
            // C# specific analysis
            if (code.includes('null.') || code.includes('.null')) {
                issues.push({
                    type: 'null_reference',
                    severity: 'high',
                    message: 'Potential null reference detected',
                    line: this.findLineNumber(code, 'null.')
                });
            }
            
            if (code.includes('Thread.Sleep') && code.includes('for')) {
                issues.push({
                    type: 'performance',
                    severity: 'medium',
                    message: 'Performance issue: Thread.Sleep in loop',
                    line: this.findLineNumber(code, 'Thread.Sleep')
                });
            }
            
            if (code.includes('catch') && code.includes('{ }')) {
                issues.push({
                    type: 'error_handling',
                    severity: 'medium',
                    message: 'Empty catch block detected',
                    line: this.findLineNumber(code, 'catch')
                });
            }
        }
        
        return issues;
    }

    detectIncompleteCode(code) {
        const patterns = [
            'TODO',
            'FIXME',
            'throw new NotImplementedException',
            '// TODO:',
            '/* TODO',
            'void Method() { }',
            'return null; // placeholder'
        ];
        
        return patterns.some(pattern => 
            code.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    generateCompletionSuggestions(code) {
        const suggestions = [];
        
        if (code.includes('TODO')) {
            suggestions.push('Switch to Generator mode for automatic implementation');
        }
        if (code.includes('NotImplementedException')) {
            suggestions.push('Generate method body based on method signature');
        }
        if (code.includes('test') || code.includes('Test')) {
            suggestions.push('Switch to Tester mode for test implementation');
        }
        
        return suggestions;
    }

    async triggerAutonomousReaction(eventData) {
        console.log('🤖 Triggering autonomous reaction:', eventData.type);
        
        try {
            // Call QuickReactiveMcp autonomous_react function
            const response = await fetch(`${this.mcpServerUrl}/api/autonomous-react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issue_type: eventData.issue_type || eventData.type,
                    code_snippet: eventData.code_snippet || '',
                    error_details: eventData.message || JSON.stringify(eventData)
                })
            });

            if (response.ok) {
                const reaction = await response.json();
                this.broadcastEvent({
                    type: 'autonomous_reaction',
                    trigger: eventData,
                    reaction: reaction,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Failed to trigger autonomous reaction:', error);
        }
    }

    broadcastEvent(event) {
        // Broadcast to dashboard via WebRTC
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'dashboard_event',
                event: event
            }));
        }

        // Also log to console for debugging
        console.log('📡 Broadcasting event:', event.type, event);
    }

    // Utility functions
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    findLineNumber(code, searchText) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText)) {
                return i + 1;
            }
        }
        return 0;
    }

    getMemoryUsage() {
        return performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : { used: 0, total: 0, limit: 0 };
    }

    getConnectionQuality() {
        if (!this.rtcConnection) return 'disconnected';
        
        const state = this.rtcConnection.connectionState;
        switch (state) {
            case 'connected': return 'excellent';
            case 'connecting': return 'connecting';
            case 'disconnected': return 'poor';
            case 'failed': return 'failed';
            default: return 'unknown';
        }
    }

    async attemptReconnection() {
        try {
            this.rtcConnection.close();
            await this.setupWebRTC();
            await this.connectToMCP();
            console.log('✅ Auto-healing successful: Reconnected');
        } catch (error) {
            console.error('❌ Auto-healing failed:', error);
        }
    }

    // Public API for manual control
    async enableAutonomousMode() {
        this.autonomousEnabled = true;
        console.log('🤖 Autonomous mode manually enabled');
    }

    async disableAutonomousMode() {
        this.autonomousEnabled = false;
        console.log('⏸️ Autonomous mode disabled');
    }

    getStatus() {
        return {
            connected: this.isConnected,
            autonomous: this.autonomousEnabled,
            events_processed: this.codeBuffer.length,
            last_activity: this.codeBuffer.length > 0 ? 
                this.codeBuffer[this.codeBuffer.length - 1].received_at : null
        };
    }
}

// Initialize Claude 4 WebRTC Bridge
const claude4Bridge = new Claude4WebRTCBridge();

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Claude4WebRTCBridge;
}

// Make available globally for dashboard integration
window.Claude4Bridge = claude4Bridge;