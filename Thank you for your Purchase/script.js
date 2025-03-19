class EULAManager {
    constructor() {
        this.checkEULA();
    }

    showEULA(callback = null) {
        const overlay = document.getElementById('eula-overlay');
        overlay.style.display = 'flex';

        const handleAccept = () => {
            localStorage.setItem('eula-accepted', 'true');
            overlay.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => {
                overlay.style.display = 'none';
                if (callback) callback(true);
            }, 500);
        };

        document.getElementById('accept-eula').onclick = handleAccept;
        document.getElementById('decline-eula').onclick = () => {
            if (callback) {
                callback(false);
            } else {
                document.body.innerHTML = `
                    <div class="access-denied">
                        <h1>Access Denied</h1>
                        <p>You must accept the license agreement to use this software.</p>
                        <button onclick="window.location.reload()">Try Again</button>
                    </div>
                `;
            }
        };
    }

    checkEULA() {
        const eulaAccepted = localStorage.getItem('eula-accepted');
        if (!eulaAccepted) {
            this.showEULA();
        }
    }
}

class ProjectManager {
    constructor() {
        this.currentProject = localStorage.getItem('lastProject');
        this.loadProjects();
        this.setupEventListeners();
        if (this.currentProject) {
            this.loadProject(this.currentProject);
        }
        this.autoSaveTimeout = null;
        this.lastSaveTime = Date.now();
    }

    loadProjects() {
        this.projects = JSON.parse(localStorage.getItem('projects')) || {};
        this.updateProjectList();
    }

    createNewProject(name) {
        // Immer EULA zeigen, unabhängig vom vorherigen Status
        new EULAManager().showEULA((accepted) => {
            if (accepted) {
                this.createNewProjectInternal(name);
            } else {
                this.showNotification('Project creation cancelled - License agreement not accepted', 'error');
            }
        });
    }

    createNewProjectInternal(name) {
        if (!name) name = `Project ${Object.keys(this.projects).length + 1}`;
        this.projects[name] = {
            html: '',
            css: '',
            js: '',
            lastModified: Date.now(),
            created: Date.now(),
            readOnly: false
        };
        
        // Neue Animation für Projekt-Erstellung
        const editor = document.querySelector('.editor-container');
        editor.classList.add('project-create-animation');
        setTimeout(() => editor.classList.remove('project-create-animation'), 1000);
        
        this.saveProjects();
        this.loadProject(name);
        this.showNotification(`Created new project: ${name}`, 'success', true);
    }

    saveCurrentProject(showNotification = false) {
        if (!this.currentProject) return false;
        
        const now = Date.now();
        if (now - this.lastSaveTime < 1000 && !showNotification) return false;
        
        try {
            // Fix: js-Editor wurde falsch gespeichert (htmlEditor statt jsEditor)
            this.projects[this.currentProject] = {
                html: htmlEditor.value,
                css: cssEditor.value,
                js: jsEditor.value, // Fix hier
                lastModified: now,
                created: this.projects[this.currentProject]?.created || now
            };
            this.saveProjects();
            localStorage.setItem('lastProject', this.currentProject);
            
            if (showNotification) {
                this.showNotification(`Saved project: ${this.currentProject}`);
            }
            this.lastSaveTime = now;
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            this.showNotification('Failed to save project!', 'error');
            return false;
        }
    }

    loadProject(name) {
        const project = this.projects[name];
        if (!project) return;

        this.currentProject = name;
        htmlEditor.value = project.html;
        cssEditor.value = project.css;
        jsEditor.value = project.js;
        
        // Aktualisiere aktiven Tab und Editor
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            const editorId = `${activeTab.dataset.tab}-code`;
            document.getElementById(editorId).style.display = 'block';
        }
        
        updatePreview();
        this.updateProjectList();
        this.showNotification(`Loaded project: ${name}`);
    }

    deleteProject(name) {
        delete this.projects[name];
        this.saveProjects();
        this.updateProjectList();
        if (this.currentProject === name) {
            this.currentProject = null;
            htmlEditor.value = '';
            cssEditor.value = '';
            jsEditor.value = '';
        }
    }

    saveProjects() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }

    updateProjectList() {
        const projectList = document.querySelector('.project-list');
        const oldItems = projectList.children;
        const oldHeight = projectList.offsetHeight;
        
        // Create new items but don't add them yet
        const newItems = Object.keys(this.projects).map(name => {
            const li = document.createElement('li');
            li.className = `project-item ${name === this.currentProject ? 'active' : ''}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            
            nameSpan.addEventListener('click', () => this.loadProject(name));
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete project "${name}"?`)) {
                    this.deleteProject(name);
                }
            });
            
            return li;
        });
        
        // Animate old items out
        Array.from(oldItems).forEach((item, i) => {
            item.style.animation = `slideOut 0.3s ease ${i * 0.05}s forwards`;
        });
        
        // After animation, update list
        setTimeout(() => {
            projectList.innerHTML = '';
            newItems.forEach((item, i) => {
                item.style.animationDelay = `${i * 0.05}s`;
                projectList.appendChild(item);
            });
        }, 300);
    }

    showNotification(message, type = 'success', important = false) {
        const notification = document.createElement('div');
        notification.className = `notification ${type} ${important ? 'important' : ''}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => notification.classList.add('show'));
        
        if (!important) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        } else {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = () => notification.remove();
            notification.appendChild(closeBtn);
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '⚠',
            info: 'ℹ',
            warning: '⚠'
        };
        return icons[type] || icons.info;
    }

    setupEventListeners() {
        const newProjectBtn = document.getElementById('new-project-btn');
        newProjectBtn.addEventListener('click', () => {
            const name = prompt('Enter project name:');
            if (name && name.trim()) {
                if (this.projects[name]) {
                    alert('A project with this name already exists!');
                    return;
                }
                this.createNewProject(name.trim());
            }
        });

        const editors = [htmlEditor, cssEditor, jsEditor];
        editors.forEach(editor => {
            editor.addEventListener('input', () => {
                // Verzögere Auto-Save und Preview-Update
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    if (this.currentProject) {
                        this.saveCurrentProject(false);
                        requestAnimationFrame(updatePreview);
                    }
                }, 1000);
            });

            // Fix für Tab-Index und Focus
            editor.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = editor.selectionStart;
                    const end = editor.selectionEnd;
                    
                    if (e.shiftKey) {
                        // Backwards tab - remove indentation
                        const beforeSelection = editor.value.substring(0, start);
                        const lineStart = beforeSelection.lastIndexOf('\n') + 1;
                        if (beforeSelection.substring(lineStart).startsWith('    ')) {
                            editor.value = beforeSelection.substring(0, lineStart) + 
                                         beforeSelection.substring(lineStart + 4) + 
                                         editor.value.substring(end);
                            editor.selectionStart = editor.selectionEnd = start - 4;
                            return;
                        }
                    }
                    
                    // Forward tab - add indentation
                    editor.value = editor.value.substring(0, start) + 
                                 '    ' + 
                                 editor.value.substring(end);
                    editor.selectionStart = editor.selectionEnd = start + 4;
                }
            });
        });

        // Fix für den Save-Button
        document.getElementById('save-project').addEventListener('click', () => {
            if (!this.currentProject) {
                const name = prompt('Enter project name:');
                if (name && name.trim()) {
                    if (this.projects[name]) {
                        if (!confirm(`Update existing project "${name}"?`)) {
                            return;
                        }
                    }
                    this.currentProject = name.trim();
                } else {
                    return;
                }
            }
            
            this.saveCurrentProject(true);
            this.updateProjectList();
        });

        // Verbesserte Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentProject(true);
            }
        });

        // Fix für Tab-Wechsel
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const activeEditor = document.querySelector('.editor:not([style*="display: none"])');
                if (activeEditor) {
                    activeEditor.blur(); // Speichern des aktuellen Inhalts
                }
            });
        });

        // Fix für Memory Leaks bei Window Events
        const beforeUnloadHandler = () => {
            if (this.currentProject) {
                this.saveCurrentProject(false);
            }
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);

        // Fix für Tab-Wechsel-Synchronisation
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const activeEditor = document.querySelector('.editor:not([style*="display: none"])');
                if (activeEditor) {
                    activeEditor.blur();
                    this.saveCurrentProject(false);
                }
                
                const newEditor = document.getElementById(`${button.dataset.tab}-code`);
                if (newEditor) {
                    setTimeout(() => newEditor.focus(), 0);
                }
            });
        });
    }
}

class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'dark';
        this.scale = parseFloat(localStorage.getItem('preview-scale')) || 0.75;
        this.setupTheme();
        this.setupZoomControls();
        this.fixPreviewScale();
    }

    setupTheme() {
        document.documentElement.dataset.theme = this.theme;
        document.getElementById('theme-toggle').addEventListener('click', () => {
            document.body.style.transition = 'background-color 0.3s ease';
            this.theme = this.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = this.theme;
            localStorage.setItem('theme', this.theme);
            
            // Smooth transition for all elements
            document.querySelectorAll('*').forEach(element => {
                element.style.transition = 'background-color 0.3s ease, color 0.3s ease';
            });
            
            setTimeout(() => {
                document.querySelectorAll('*').forEach(element => {
                    element.style.transition = '';
                });
            }, 300);
        });
    }

    setupZoomControls() {
        document.documentElement.style.setProperty('--scale', this.scale);
        
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.scale = Math.min(1, this.scale + 0.1);
            this.updateScale();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.scale = Math.max(0.3, this.scale - 0.1);
            this.updateScale();
        });

        document.getElementById('zoom-reset').addEventListener('click', () => {
            this.scale = 0.75;
            this.updateScale();
        });
    }

    fixPreviewScale() {
        const resizeObserver = new ResizeObserver(() => {
            this.updateScale();
        });
        
        resizeObserver.observe(document.querySelector('.preview-container'));
        
        // Fix für initiale Skalierung
        setTimeout(() => this.updateScale(), 100);
    }

    updateScale() {
        document.documentElement.style.setProperty('--scale', this.scale);
        localStorage.setItem('preview-scale', this.scale.toString());
        document.getElementById('zoom-reset').textContent = 
            `${Math.round(this.scale * 100)}%`;
        
        const preview = document.querySelector('.preview');
        if (preview) {
            preview.style.width = `${100 / this.scale}%`;
            preview.style.height = `${100 / this.scale}%`;
        }
    }
}

class EditorManager {
    constructor() {
        this.setupEditors();
        this.setupPerformanceMode();
        this.addLineNumbers();
        this.setupAutoComplete();
        this.fixScrollSync();
    }

    setupEditors() {
        const editors = {
            html: document.getElementById('html-code'),
            css: document.getElementById('css-code'),
            js: document.getElementById('js-code')
        };

        Object.entries(editors).forEach(([type, editor]) => {
            editor.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = editor.selectionStart;
                    const end = editor.selectionEnd;
                    editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
                    editor.selectionStart = editor.selectionEnd = start + 4;
                }
            });

            // Auto-close brackets and quotes
            editor.addEventListener('input', (e) => {
                const pairs = {
                    '(': ')',
                    '{': '}',
                    '[': ']',
                    '"': '"',
                    "'": "'",
                    '<': '>'
                };

                const pos = editor.selectionStart;
                const char = editor.value[pos - 1];

                if (pairs[char]) {
                    const selection = window.getSelection().toString();
                    editor.value = editor.value.slice(0, pos) + 
                                 selection + 
                                 pairs[char] + 
                                 editor.value.slice(pos);
                    editor.selectionStart = editor.selectionEnd = pos;
                }
            });
        });

        // Set language indicator
        const container = document.querySelector('.editor-container');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                container.dataset.language = button.textContent.toUpperCase();
            });
        });

        // Debounce für Performance
        let updateTimeout;
        editors.forEach(editor => {
            editor.addEventListener('input', () => {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(updatePreview, 300);
            });
        });

        // Code-Faltung
        this.setupCodeFolding(editors);
    }

    setupPerformanceMode() {
        let isTyping = false;
        let typingTimer;

        document.querySelectorAll('.editor').forEach(editor => {
            editor.addEventListener('input', () => {
                if (!isTyping) {
                    document.body.classList.add('performance-mode');
                    isTyping = true;
                }
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    document.body.classList.remove('performance-mode');
                    isTyping = false;
                }, 1000);
            });
        });
    }

    addLineNumbers() {
        document.querySelectorAll('.editor').forEach(editor => {
            const lineNumbers = document.createElement('div');
            lineNumbers.className = 'line-numbers';
            editor.parentNode.insertBefore(lineNumbers, editor);

            const updateLineNumbers = () => {
                const lines = editor.value.split('\n').length;
                lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => 
                    `<div>${i + 1}</div>`).join('');
            };

            editor.addEventListener('input', updateLineNumbers);
            editor.addEventListener('scroll', () => {
                lineNumbers.scrollTop = editor.scrollTop;
            });
            updateLineNumbers();
        });
    }

    setupCodeFolding(editors) {
        // Code-Faltung Implementierung hier
    }

    setupAutoComplete() {
        const editors = document.querySelectorAll('.editor');
        editors.forEach(editor => {
            editor.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const pos = editor.selectionStart;
                    const lastLine = editor.value.substring(0, pos).split('\n').pop();
                    const indent = lastLine.match(/^\s*/)[0];
                    
                    if (lastLine.trim().endsWith('{')) {
                        e.preventDefault();
                        const newIndent = indent + '    ';
                        const insertion = `\n${newIndent}\n${indent}}`;
                        editor.value = editor.value.substring(0, pos) + 
                                     insertion + 
                                     editor.value.substring(pos);
                        editor.selectionStart = editor.selectionEnd = pos + newIndent.length + 1;
                    }
                }
            });
        });
    }

    fixScrollSync() {
        const lineNumbers = document.querySelectorAll('.line-numbers');
        lineNumbers.forEach(numbers => {
            const editor = numbers.nextElementSibling;
            if (editor) {
                editor.addEventListener('scroll', () => {
                    numbers.scrollTop = editor.scrollTop;
                    numbers.style.transform = `translateY(${-editor.scrollTop}px)`;
                });
            }
        });
    }
}

// Fix für Preview-Performance und Error-Handling
function updatePreview() {
    const frame = document.querySelector('.preview');
    if (!frame) return;

    // Verhindere zu häufige Updates
    if (frame._updating) return;
    frame._updating = true;

    requestAnimationFrame(() => {
        try {
            const content = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <base target="_blank">
                        <style>
                            ${cssEditor.value || ''}
                            body { margin: 0; padding: 10px; box-sizing: border-box; }
                        </style>
                    </head>
                    <body>
                        ${htmlEditor.value || ''}
                        <script>
                            window.onerror = (msg, url, line, col, error) => {
                                console.error('Error:', msg, '\\nLine:', line, '\\nColumn:', col);
                                return true;
                            };
                            try {
                                ${jsEditor.value || ''}
                            } catch(e) {
                                console.error('JavaScript Error:', e.message);
                            }
                        <\/script>
                    </body>
                </html>
            `;
            frame.srcdoc = content;
        } catch (error) {
            console.error('Preview update failed:', error);
        } finally {
            frame._updating = false;
        }
    });
}

// Initialize EditorManager after ProjectManager
new ThemeManager();
new EditorManager();
new EULAManager();
