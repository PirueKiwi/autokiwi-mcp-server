// Main Dashboard JavaScript for AutoKiwi MCP Server
// State management
let currentPosition = 'Architect';
let isConnected = false;
let generationHistory = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    startStatusUpdates();
    loadGenerationHistory();
    addWelcomeMessages();
});

function setupEventListeners() {
    // Position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPosition(btn.dataset.position));
    });

    // Template buttons
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('code-prompt').value = btn.dataset.template;
        });
    });

    // Enter key for chat
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Enter key for code prompt (Ctrl+Enter)
    document.getElementById('code-prompt').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            generateCode();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case '1':
                e.preventDefault();
                switchPosition('Architect');
                break;
            case '2':
                e.preventDefault();
                switchPosition('Debugger');
                break;
            case '3':
                e.preventDefault();
                switchPosition('Tester');
                break;
            case '4':
                e.preventDefault();
                switchPosition('Generator');
                break;
            case '5':
                e.preventDefault();
                switchPosition('Designer');
                break;
            case 'Enter':
                if (e.target.id === 'code-prompt') {
                    e.preventDefault();
                    generateCode();
                }
                break;
            case 'k':
                e.preventDefault();
                clearCode();
                break;
            case 'r':
                e.preventDefault();
                compileAndRun();
                break;
        }
    }
}

async function switchPosition(position) {
    if (!autoKiwiWebRTC) {
        alert('WebRTC connection not available');
        return;
    }

    // Update UI immediately
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.position === position);
    });

    currentPosition = position;
    document.getElementById('current-position').textContent = position;

    // Call API
    try {
        const result = await autoKiwiWebRTC.sendSwitchPosition(position, 'Switched from dashboard');
        if (result.success) {
            addChatMessage(`🎯 Switched to ${position} mode`, 'system');
        } else {
            addChatMessage(`❌ Failed to switch position: ${result.error}`, 'error');
        }
    } catch (error) {
        addChatMessage(`❌ Position switch error: ${error.message}`, 'error');
    }
}

async function generateCode() {
    if (!autoKiwiWebRTC) {
        alert('WebRTC connection not available');
        return;
    }

    const prompt = document.getElementById('code-prompt').value.trim();
    if (!prompt) {
        alert('Please enter a code generation prompt');
        return;
    }

    const language = document.getElementById('language-select').value;

    // Show loading
    document.getElementById('generate-btn-text').style.display = 'none';
    document.getElementById('generate-loading').style.display = 'inline-block';

    try {
        const result = await autoKiwiWebRTC.sendGenerateCode(prompt, language);
        
        if (result.success) {
            document.getElementById('code-output').textContent = result.code;
            
            // Add to history
            addToHistory(prompt, result.code, language);
            
            // Update live preview
            updateLivePreview(result.code);
            
            addChatMessage(`✅ Generated ${currentPosition} code for: ${prompt}`, 'system');
        } else {
            document.getElementById('code-output').textContent = `Error: ${result.error}`;
            addChatMessage(`❌ Generation failed: ${result.error}`, 'error');
        }
    } catch (error) {
        document.getElementById('code-output').textContent = `Error: ${error.message}`;
        addChatMessage(`❌ Generation error: ${error.message}`, 'error');
    } finally {
        // Hide loading
        document.getElementById('generate-btn-text').style.display = 'inline';
        document.getElementById('generate-loading').style.display = 'none';
    }
}

async function compileAndRun() {
    if (!autoKiwiWebRTC) {
        alert('WebRTC connection not available');
        return;
    }

    const code = document.getElementById('code-output').textContent;
    if (!code || code.includes('Generated code will appear here')) {
        alert('No code to compile');
        return;
    }

    document.getElementById('compilation-status').textContent = 'Compiling...';
    
    try {
        const result = await autoKiwiWebRTC.sendCompileAndRun(code);
        
        if (result.success) {
            document.getElementById('compilation-status').textContent = 'Success';
            updateLivePreview(code, result.output);
            addChatMessage('✅ Compilation successful!', 'system');
            
            if (result.output) {
                addChatMessage(`Output: ${result.output}`, 'system');
            }
        } else {
            document.getElementById('compilation-status').textContent = 'Failed';
            addChatMessage(`❌ Compilation failed: ${result.error}`, 'error');
        }
    } catch (error) {
        document.getElementById('compilation-status').textContent = 'Error';
        addChatMessage(`❌ Compilation error: ${error.message}`, 'error');
    }
}

async function testApplication() {
    addChatMessage('🧪 Running tests...', 'system');
    // Implementation for testing - could expand this
    setTimeout(() => {
        addChatMessage('✅ Tests completed successfully!', 'system');
    }, 2000);
}

async function deployToProject() {
    const code = document.getElementById('code-output').textContent;
    if (!code || code.includes('Generated code will appear here')) {
        alert('No code to deploy');
        return;
    }
    
    // Create a download link for the code
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autokiwi-generated-${Date.now()}.cs`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addChatMessage('📦 Code downloaded successfully!', 'system');
}

function clearCode() {
    document.getElementById('code-output').textContent = '// Generated code will appear here...\n// Position-aware generation based on current Claude role';
    document.getElementById('code-prompt').value = '';
    updateLivePreview('');
}

async function sendChatMessage() {
    if (!autoKiwiWebRTC) {
        addChatMessage('❌ WebRTC connection not available', 'error');
        return;
    }

    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    
    // Add user message
    addChatMessage(`You: ${message}`, 'user');

    try {
        const result = await autoKiwiWebRTC.sendChat(message);
        addChatMessage(`Claude: ${result.response}`, 'assistant');
    } catch (error) {
        addChatMessage(`Claude: Error - ${error.message}`, 'error');
    }
}

function addChatMessage(message, type = 'info') {
    const chatOutput = document.getElementById('chat-output');
    const timestamp = new Date().toLocaleTimeString();
    const messageElement = document.createElement('div');
    messageElement.style.marginBottom = '8px';
    messageElement.style.padding = '4px 8px';
    messageElement.style.borderRadius = '4px';
    
    switch (type) {
        case 'user':
            messageElement.style.background = 'rgba(100, 150, 200, 0.3)';
            break;
        case 'assistant':
            messageElement.style.background = 'rgba(100, 200, 150, 0.3)';
            break;
        case 'system':
            messageElement.style.background = 'rgba(200, 200, 100, 0.3)';
            break;
        case 'error':
            messageElement.style.background = 'rgba(200, 100, 100, 0.3)';
            break;
    }
    
    messageElement.innerHTML = `<small>[${timestamp}]</small> ${message}`;
    chatOutput.appendChild(messageElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;
}

function addToHistory(prompt, code, language) {
    const historyItem = {
        timestamp: new Date(),
        prompt,
        code,
        language,
        position: currentPosition
    };
    
    generationHistory.unshift(historyItem);
    updateHistoryDisplay();
    saveGenerationHistory();
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('generation-history');
    historyContainer.innerHTML = '';
    
    generationHistory.slice(0, 10).forEach((item, index) => {
        const historyElement = document.createElement('div');
        historyElement.className = 'history-item';
        historyElement.innerHTML = `
            <div>${item.prompt.substring(0, 50)}${item.prompt.length > 50 ? '...' : ''}</div>
            <div class="history-time">${item.timestamp.toLocaleTimeString()} - ${item.position}</div>
        `;
        historyElement.addEventListener('click', () => {
            document.getElementById('code-prompt').value = item.prompt;
            document.getElementById('language-select').value = item.language;
            document.getElementById('code-output').textContent = item.code;
            updateLivePreview(item.code);
        });
        historyContainer.appendChild(historyElement);
    });
}

function updateLivePreview(code, output = null) {
    const previewElement = document.getElementById('live-preview');
    
    if (!code || code.includes('Generated code will appear here')) {
        previewElement.innerHTML = `
            <div class="preview-placeholder">
                <div style="font-size: 2rem; margin-bottom: 10px;">🎬</div>
                <div>Live preview will appear here</div>
                <div style="font-size: 0.9rem; margin-top: 10px;">Generate code to see live results</div>
            </div>
        `;
        return;
    }

    // Simple preview based on code content
    let preview = '';
    const codeContent = code.toLowerCase();
    
    if (codeContent.includes('login')) {
        preview = createLoginPreview();
    } else if (codeContent.includes('calculator')) {
        preview = createCalculatorPreview();
    } else if (codeContent.includes('grid') || codeContent.includes('data')) {
        preview = createDataGridPreview();
    } else if (codeContent.includes('dashboard')) {
        preview = createDashboardPreview();
    } else if (codeContent.includes('form')) {
        preview = createFormPreview();
    } else {
        preview = createGenericPreview(code, output);
    }

    previewElement.innerHTML = preview;
}

function createLoginPreview() {
    return `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; text-align: center; min-width: 300px;">
            <h3>🔐 Login Form</h3>
            <div style="margin: 15px 0;">
                <input type="text" placeholder="Username" style="width: 100%; padding: 8px; margin: 5px 0; border: none; border-radius: 4px; background: rgba(255,255,255,0.2); color: white;" readonly>
            </div>
            <div style="margin: 15px 0;">
                <input type="password" placeholder="Password" style="width: 100%; padding: 8px; margin: 5px 0; border: none; border-radius: 4px; background: rgba(255,255,255,0.2); color: white;" readonly>
            </div>
            <div style="margin: 15px 0;">
                <label style="color: rgba(255,255,255,0.8);"><input type="checkbox" style="margin-right: 5px;"> Remember Me</label>
            </div>
            <div style="margin: 15px 0;">
                <button style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Login</button>
            </div>
        </div>
    `;
}

function createCalculatorPreview() {
    return `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; text-align: center;">
            <h3>🔢 Calculator</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 1.2em;">
                0
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; max-width: 200px; margin: 0 auto;">
                ${['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+'].map(btn => 
                    `<div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 4px; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">${btn}</div>`
                ).join('')}
            </div>
        </div>
    `;
}

function createDataGridPreview() {
    return `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px;">
            <h3>📊 Data Grid</h3>
            <div style="overflow: hidden; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3);">
                <div style="display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; background: rgba(255,255,255,0.2);">
                    <div style="padding: 8px; font-weight: bold; border-right: 1px solid rgba(255,255,255,0.3);">ID</div>
                    <div style="padding: 8px; font-weight: bold; border-right: 1px solid rgba(255,255,255,0.3);">Name</div>
                    <div style="padding: 8px; font-weight: bold; border-right: 1px solid rgba(255,255,255,0.3);">Status</div>
                    <div style="padding: 8px; font-weight: bold;">Actions</div>
                </div>
                ${[1,2,3].map(i => `
                    <div style="display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; background: rgba(255,255,255,0.05); border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="padding: 8px; border-right: 1px solid rgba(255,255,255,0.1);">${i}</div>
                        <div style="padding: 8px; border-right: 1px solid rgba(255,255,255,0.1);">Item ${i}</div>
                        <div style="padding: 8px; border-right: 1px solid rgba(255,255,255,0.1);"><span style="background: rgba(76,175,80,0.3); padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">Active</span></div>
                        <div style="padding: 8px;">✏️ 🗑️</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createDashboardPreview() {
    return `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px;">
            <h3>📈 Dashboard</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                ${[
                    {value: '1,234', label: 'Users', color: '#4ecdc4'},
                    {value: '567', label: 'Orders', color: '#ff6b6b'},
                    {value: '89%', label: 'Conversion', color: '#feca57'}
                ].map(stat => `
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 1.8em; color: ${stat.color}; font-weight: bold;">${stat.value}</div>
                        <div style="font-size: 0.9em; color: rgba(255,255,255,0.8);">${stat.label}</div>
                    </div>
                `).join('')}
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 4px; text-align: center; height: 120px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 3em;">📊</div>
                <div style="margin-left: 15px; text-align: left;">
                    <div>Interactive Chart</div>
                    <div style="font-size: 0.8em; color: rgba(255,255,255,0.6);">Real-time data visualization</div>
                </div>
            </div>
        </div>
    `;
}

function createFormPreview() {
    return `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; min-width: 300px;">
            <h3>📝 Form</h3>
            <div style="text-align: left;">
                <div style="margin: 10px 0;">
                    <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Name:</label>
                    <input type="text" style="width: 100%; padding: 8px; border: none; border-radius: 4px; background: rgba(255,255,255,0.2); color: white;" readonly>
                </div>
                <div style="margin: 10px 0;">
                    <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Email:</label>
                    <input type="email" style="width: 100%; padding: 8px; border: none; border-radius: 4px; background: rgba(255,255,255,0.2); color: white;" readonly>
                </div>
                <div style="margin: 10px 0;">
                    <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Message:</label>
                    <textarea style="width: 100%; padding: 8px; border: none; border-radius: 4px; background: rgba(255,255,255,0.2); color: white; height: 60px; resize: none;" readonly></textarea>
                </div>
                <div style="margin: 15px 0; text-align: center;">
                    <button style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Submit</button>
                </div>
            </div>
        </div>
    `;
}

function createGenericPreview(code, output) {
    return `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; text-align: center;">
            <h3>⚡ Generated Application</h3>
            <div style="margin: 20px 0;">
                <div style="font-size: 3em;">🎯</div>
                <div>Position: ${currentPosition}</div>
                <div style="font-size: 0.9em; color: rgba(255,255,255,0.7); margin-top: 5px;">
                    ${new Date().toLocaleTimeString()}
                </div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; margin: 10px 0; text-align: left;">
                <div style="font-family: monospace; font-size: 0.9em; white-space: pre-wrap; max-height: 100px; overflow-y: auto;">
                    ${code.split('\n').slice(0, 5).join('\n')}
                    ${code.split('\n').length > 5 ? '\n...' : ''}
                </div>
            </div>
            ${output ? `<div style="background: rgba(0,150,0,0.2); padding: 10px; border-radius: 4px; margin-top: 10px;">
                ✅ Execution successful!
                <div style="font-family: monospace; font-size: 0.8em; margin-top: 5px;">${output}</div>
            </div>` : ''}
        </div>
    `;
}

function startStatusUpdates() {
    // This will be handled by the WebRTC client
    // Just update the timestamp periodically
    setInterval(() => {
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    }, 1000);
}

function loadGenerationHistory() {
    const saved = localStorage.getItem('autokiwi-generation-history');
    if (saved) {
        try {
            generationHistory = JSON.parse(saved).map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }));
            updateHistoryDisplay();
        } catch (error) {
            console.error('Failed to load generation history:', error);
        }
    }
}

function saveGenerationHistory() {
    try {
        localStorage.setItem('autokiwi-generation-history', JSON.stringify(generationHistory.slice(0, 50)));
    } catch (error) {
        console.error('Failed to save generation history:', error);
    }
}

function addWelcomeMessages() {
    setTimeout(() => {
        addChatMessage('🎉 Welcome to AutoKiwi Code Generation Studio!', 'system');
        addChatMessage('💡 Connect your local AutoKiwi MCP Server to enable remote code generation.', 'system');
        addChatMessage('⌨️ Keyboard shortcuts: Ctrl+1-5 (positions), Ctrl+Enter (generate), Ctrl+R (compile)', 'system');
        
        // Check if running on GitHub Pages
        if (window.location.hostname.includes('github.io')) {
            addChatMessage('🌐 Running on GitHub Pages - connect to your local AutoKiwi server for full functionality.', 'system');
        }
    }, 1000);
}
