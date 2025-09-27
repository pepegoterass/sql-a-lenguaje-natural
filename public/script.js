class ChatBot {
    constructor() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.questionForm = document.getElementById('questionForm');
        this.questionInput = document.getElementById('questionInput');
        this.sendButton = document.getElementById('sendButton');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusText = document.getElementById('statusText');
        
        // Statistics
        this.stats = {
            queryCount: 0,
            totalTime: 0,
            lastQueryTime: null
        };
        
        this.init();
    }

    init() {
        this.questionForm.addEventListener('submit', this.handleSubmit.bind(this));
        this.checkConnection();
        
        // Check connection every 30 seconds
        setInterval(() => this.checkConnection(), 30000);
    }

    async checkConnection() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (response.ok && data.status === 'healthy') {
                this.updateConnectionStatus(true, 'Conectado');
            } else {
                this.updateConnectionStatus(false, 'Base de datos no disponible');
            }
        } catch (error) {
            this.updateConnectionStatus(false, 'Sin conexión');
        }
    }

    updateConnectionStatus(isConnected, message) {
        this.connectionStatus.className = `w-3 h-3 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
        }`;
        this.statusText.textContent = message;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const question = this.questionInput.value.trim();
        if (!question) return;

        // Add user message
        this.addMessage(question, 'user');
        
        // Clear input and disable form
        this.questionInput.value = '';
        this.setLoading(true);

        try {
            const startTime = Date.now();
            
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question })
            });

            const data = await response.json();
            const executionTime = Date.now() - startTime;

            if (response.ok) {
                this.addMessage(data, 'bot', executionTime);
                this.updateStats(executionTime);
            } else {
                this.addErrorMessage(data, executionTime);
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.addErrorMessage({
                error: 'Error de conexión',
                details: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
            });
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(content, type, executionTime = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message mb-4';

        if (type === 'user') {
            messageDiv.innerHTML = `
                <div class="flex items-start justify-end">
                    <div class="bg-blue-600 text-white rounded-lg p-4 shadow-sm max-w-lg mr-3">
                        <p>${this.escapeHtml(content)}</p>
                    </div>
                    <div class="bg-blue-600 rounded-full p-2">
                        <i class="fas fa-user text-white"></i>
                    </div>
                </div>
            `;
        } else if (type === 'bot') {
            const naturalResponse = content.naturalResponse || 'Consulta ejecutada exitosamente.';
            const hasData = content.rows && content.rows.length > 0;
            
            messageDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="bg-blue-100 rounded-full p-2 mr-3">
                        <i class="fas fa-robot text-blue-600"></i>
                    </div>
                    <div class="bg-white rounded-lg p-4 shadow-sm max-w-full flex-1">
                        <div class="mb-3">
                            <p class="text-gray-800 mb-2">${this.escapeHtml(naturalResponse)}</p>
                        </div>
                        
                        ${hasData ? `
                            <div class="mb-3">
                                <button onclick="toggleResults(this)" class="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition">
                                    <i class="fas fa-chevron-down mr-2"></i>
                                    📊 Ver ${content.rows.length} resultado(s)
                                </button>
                                <div class="hidden mt-3 p-2 bg-gray-50 rounded-lg" id="results-${Date.now()}">
                                    ${this.formatResults(content.rows)}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="border-t pt-3 mt-3">
                            <button onclick="toggleSql(this)" class="text-gray-600 hover:text-gray-800 text-xs flex items-center bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 transition">
                                <i class="fas fa-code mr-1"></i>
                                🔍 Ver consulta SQL
                            </button>
                            <div class="hidden mt-2">
                                <div class="sql-code">
                                    <code style="font-size: 12px; line-height: 1.4;">${this.escapeHtml(content.sql)}</code>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-between items-center text-xs text-gray-500 mt-2">
                            <span>${content.explanation}</span>
                            ${executionTime ? `<span>${executionTime}ms</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addErrorMessage(error, executionTime = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message mb-4';

        messageDiv.innerHTML = `
            <div class="flex items-start">
                <div class="bg-red-100 rounded-full p-2 mr-3">
                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm max-w-lg">
                    <p class="text-red-800 font-medium">${this.escapeHtml(error.error || 'Error desconocido')}</p>
                    ${error.details ? `<p class="text-red-600 text-sm mt-1">${this.escapeHtml(error.details)}</p>` : ''}
                    ${executionTime ? `<div class="text-xs text-red-500 mt-2">${executionTime}ms</div>` : ''}
                </div>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatResults(rows) {
        if (!rows || rows.length === 0) {
            return '<p class="text-gray-500 text-sm">No se encontraron resultados.</p>';
        }

        const maxRows = Math.min(rows.length, 10); // Mostrar máximo 10 filas
        const displayRows = rows.slice(0, maxRows);

        let html = '<div class="table-container"><table class="results-table">';
        
        // Header
        if (displayRows.length > 0) {
            const headers = Object.keys(displayRows[0]);
            html += '<thead><tr>';
            headers.forEach(header => {
                // Truncar nombres de columnas muy largos
                const shortHeader = header.length > 15 ? header.substring(0, 12) + '...' : header;
                html += `<th title="${this.escapeHtml(header)}">${this.escapeHtml(shortHeader)}</th>`;
            });
            html += '</tr></thead>';

            // Body
            html += '<tbody>';
            displayRows.forEach((row, index) => {
                html += '<tr>';
                headers.forEach(header => {
                    let value = row[header];
                    if (value === null || value === undefined) {
                        value = '-';
                    } else if (typeof value === 'object') {
                        value = JSON.stringify(value);
                    } else {
                        value = String(value);
                    }
                    
                    // Truncar valores muy largos para evitar solapamiento
                    const shortValue = value.length > 25 ? value.substring(0, 22) + '...' : value;
                    html += `<td title="${this.escapeHtml(value)}">${this.escapeHtml(shortValue)}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }
        
        html += '</table></div>';
        
        if (rows.length > maxRows) {
            html += `<p class="text-gray-500 text-xs mt-2 text-center">📊 Mostrando ${maxRows} de ${rows.length} resultados</p>`;
        }

        return html;
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.sendButton.disabled = true;
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
            this.questionInput.disabled = true;
            
            // Add loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message mb-4';
            loadingDiv.id = 'loading-message';
            loadingDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="bg-gray-100 rounded-full p-2 mr-3 loading">
                        <i class="fas fa-robot text-gray-600"></i>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-4 shadow-sm">
                        <p class="text-gray-600 flex items-center">
                            <i class="fas fa-spinner fa-spin mr-2"></i>
                            Procesando tu consulta con IA...
                        </p>
                    </div>
                </div>
            `;
            this.messagesContainer.appendChild(loadingDiv);
            this.scrollToBottom();
        } else {
            this.sendButton.disabled = false;
            this.sendButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar';
            this.questionInput.disabled = false;
            this.questionInput.focus();
            
            // Remove loading message
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
        }
    }

    updateStats(executionTime) {
        this.stats.queryCount++;
        this.stats.totalTime += executionTime;
        this.stats.lastQueryTime = new Date().toLocaleTimeString();

        document.getElementById('queryCount').textContent = this.stats.queryCount;
        document.getElementById('avgTime').textContent = Math.round(this.stats.totalTime / this.stats.queryCount) + 'ms';
        document.getElementById('lastQuery').textContent = this.stats.lastQueryTime;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions
function fillExample(question) {
    document.getElementById('questionInput').value = question;
    document.getElementById('questionInput').focus();
}

function toggleResults(button) {
    const resultsDiv = button.parentElement.querySelector('div[id^="results-"]');
    const icon = button.querySelector('i');
    
    if (resultsDiv.classList.contains('hidden')) {
        resultsDiv.classList.remove('hidden');
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        button.innerHTML = button.innerHTML.replace('📊 Ver', '📊 Ocultar');
    } else {
        resultsDiv.classList.add('hidden');
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        button.innerHTML = button.innerHTML.replace('📊 Ocultar', '📊 Ver');
    }
}

function toggleSql(button) {
    const sqlDiv = button.parentElement.querySelector('div.hidden');
    
    if (sqlDiv.classList.contains('hidden')) {
        sqlDiv.classList.remove('hidden');
        button.innerHTML = '<i class="fas fa-code mr-1"></i>🔍 Ocultar consulta SQL';
    } else {
        sqlDiv.classList.add('hidden');
        button.innerHTML = '<i class="fas fa-code mr-1"></i>🔍 Ver consulta SQL';
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});