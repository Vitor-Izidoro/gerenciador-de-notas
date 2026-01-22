// --- 1. VARIÁVEIS GLOBAIS ---
let notes = [];
let currentNote = null;

// Elementos Principais
const list = document.getElementById("noteList");
const editor = document.getElementById("editor");
const titleInput = document.getElementById("title");
const tagsInput = document.getElementById("tagsInput");
const preview = document.getElementById("preview");
const search = document.getElementById("search");
// ...
// Botões Principais
const btnNewNote = document.getElementById("newNote");
const toggleBtn = document.getElementById("toggleTheme");
const btnPdf = document.getElementById("btnPdf");
const btnGraph = document.getElementById("btnGraph");
const btnDelete = document.getElementById("btnDelete");
const btnPin = document.getElementById("btnPin");

// --- CORREÇÃO: Botões do Modo Leitura (Faltavam aqui) ---
const btnReader = document.getElementById("btnReader");
const btnExitReader = document.getElementById("exitReaderMode");
const btnMd = document.getElementById("btnMd"); // Caso tenha o botão de Markdown também

// Elementos do Grafo
const graphModal = document.getElementById("graphModal");
const closeGraph = document.getElementById("closeGraph");
const networkContainer = document.getElementById("mynetwork");

// --- 2. FUNÇÕES GLOBAIS ---

window.openWikiLink = (title) => {
    let targetNote = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
    
    if (targetNote) {
        openNote(targetNote);
        if(graphModal) graphModal.style.display = "none";
    } else {
        if (confirm(`A nota "${title}" não existe. Criar agora?`)) {
            const newNote = { 
                title: title, 
                content: `# ${title}\n\nNota criada via conexão.` 
            };
            notes.unshift(newNote);
            save();
            openNote(newNote);
            if(graphModal) graphModal.style.display = "none";
        }
    }
};

// Função para Executar Código
window.runCodeBlock = async (lang, encodedCode, outputId) => {
    const outputDiv = document.getElementById(outputId);
    outputDiv.style.display = "block";
    outputDiv.textContent = "⏳ Executando...";
    outputDiv.style.color = "#888";

    try {
        const code = decodeURIComponent(escape(atob(encodedCode)));
        const result = await window.electronAPI.runCode({ language: lang, code: code });
        
        outputDiv.textContent = result;
        outputDiv.style.color = result.startsWith("Erro") ? "#ff6b6b" : "var(--text-color)";
    } catch (e) {
        outputDiv.textContent = "Erro na comunicação: " + e.message;
    }
};

function renderGraph() {
    if (typeof vis === 'undefined') return alert("Erro: vis.js não carregado.");
    if (graphModal.style.display === "none") graphModal.style.display = "flex";

    const nodesData = [];
    const edgesData = [];
    const nodeIds = new Set();

    notes.forEach(note => {
        nodesData.push({ id: note.title, label: note.title, value: 10 });
        nodeIds.add(note.title.toLowerCase());
    });

    const linkRegex = /\[\[([^\]]+)\]\]/g;
    notes.forEach(source => {
        let match;
        const content = source.content || "";
        while ((match = linkRegex.exec(content)) !== null) {
            const targetName = match[1].trim();
            const targetExists = [...nodeIds].find(id => id === targetName.toLowerCase());
            if (targetExists) {
                const realTarget = notes.find(n => n.title.toLowerCase() === targetExists).title;
                edgesData.push({ from: source.title, to: realTarget });
            }
        }
    });

    const network = new vis.Network(networkContainer, {
        nodes: new vis.DataSet(nodesData),
        edges: new vis.DataSet(edgesData)
    }, {
        nodes: { shape: 'dot', font: { color: document.body.classList.contains('dark-mode') ? '#ddd' : '#333' } },
        edges: { arrows: 'to' },
        physics: { stabilization: false }
    });
    
    setTimeout(() => { network.fit(); }, 100);
    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const note = notes.find(n => n.title === params.nodes[0]);
            if (note) openNote(note);
            graphModal.style.display = "none";
        }
    });
}

// --- 3. INICIALIZAÇÃO ---

async function initApp() {
    try {
        if (window.electronAPI) notes = await window.electronAPI.loadNotes();
    } catch (e) { console.error(e); }
    
    if (!Array.isArray(notes)) notes = [];
    
    const today = new Date().toISOString().split("T")[0];
    if (!notes.find(n => n.title === today)) {
        notes.unshift({ title: today, content: "# Nota do Dia\n" });
        save();
    }

    renderList();
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        if(toggleBtn) toggleBtn.textContent = "☀️";
    }
    if (notes.length > 0) openNote(notes[0]);
}

function save() {
    if (window.electronAPI) window.electronAPI.saveNotes(notes);
    renderList();
}

function renderList(filter = "") {
    list.innerHTML = "";

    // LÓGICA DE BUSCA INTELIGENTE
    // Se começar com #, busca por TAG. Se não, busca por TÍTULO.
    let filtered = [];
    if (filter.startsWith("#")) {
        const tagToSearch = filter.substring(1); // Remove o #
        filtered = notes.filter(n => n.tags && n.tags.some(t => t.includes(tagToSearch)));
    } else {
        filtered = notes.filter(n => n.title.toLowerCase().includes(filter));
    }

    const pinned = filtered.filter(n => n.pinned === true);
    const others = filtered.filter(n => !n.pinned);

    const createItem = (n) => {
        const li = document.createElement("li");
        
        // Título da nota
        const titleSpan = document.createElement("div");
        titleSpan.textContent = n.title;
        titleSpan.style.fontWeight = (currentNote && n === currentNote) ? "bold" : "normal";
        li.appendChild(titleSpan);

        // --- EXIBIR TAGS NA LISTA ---
        if (n.tags && n.tags.length > 0) {
            const tagContainer = document.createElement("div");
            tagContainer.className = "tag-container";
            
            n.tags.forEach(tag => {
                const badge = document.createElement("span");
                badge.className = "tag-badge";
                badge.textContent = "#" + tag;
                tagContainer.appendChild(badge);
            });
            li.appendChild(tagContainer);
        }
        // ---------------------------

        if (n.pinned) li.classList.add("pinned-note");
        li.onclick = () => openNote(n);
        list.appendChild(li);
    };

    if (pinned.length > 0) {
        const sep = document.createElement("div");
        sep.className = "list-separator";
        sep.textContent = "📌 Fixados";
        list.appendChild(sep);
        pinned.forEach(createItem);
    }

    if (others.length > 0) {
        if (pinned.length > 0) {
            const sep = document.createElement("div");
            sep.className = "list-separator";
            sep.textContent = "📝 Notas";
            list.appendChild(sep);
        }
        others.forEach(createItem);
    }
}
function openNote(note) {
    currentNote = note;
    titleInput.value = note.title;
    editor.value = note.content || "";
    
    // --- CARREGA AS TAGS (Transforma Array em Texto com vírgulas) ---
    if (note.tags && Array.isArray(note.tags)) {
        tagsInput.value = note.tags.join(", ");
    } else {
        tagsInput.value = "";
    }
    // -------------------------------------------------------------

    if(btnPin) btnPin.classList.toggle("active", !!note.pinned);
    renderPreview();
    renderList(search.value.toLowerCase());
}

// --- 4. MARKDOWN & RENDERER ---
if (typeof marked !== 'undefined') {
    const renderer = new marked.Renderer();

    renderer.code = ({ text, lang }) => {
        const validLang = (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) ? lang : 'plaintext';
        const highlighted = (typeof hljs !== 'undefined') ? hljs.highlight(text, { language: validLang }).value : text;
        
        const blockId = "code-" + Math.random().toString(36).substr(2, 9);
        
        // 1. Prepara o código seguro para ser copiado/executado
        // Usamos encodeURIComponent para garantir que caracteres especiais não quebrem o HTML
        const safeCode = btoa(unescape(encodeURIComponent(text)));
        
        // 2. Botão de Executar (Só para JS e Python)
        let runButton = "";
        if (validLang === 'javascript' || validLang === 'js' || validLang === 'python' || validLang === 'py') {
            runButton = `<button class="run-btn" onclick="window.runCodeBlock('${validLang}', '${safeCode}', '${blockId}')">▶️ Executar</button>`;
        }

        // 3. Botão de Copiar (NOVO)
        // Adicionamos ele sempre, independente da linguagem
        const copyButton = `<button class="copy-btn" onclick="window.copyToClipboard('${safeCode}', this)">📋 Copiar</button>`;

        return `
            <div class="code-block-container">
                <div class="code-header">
                    <span>${validLang}</span>
                    <div class="code-actions">
                        ${copyButton}
                        ${runButton}
                    </div>
                </div>
                <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
                <div id="${blockId}" class="code-output" style="display:none;"></div>
            </div>
        `;
    };

    const wikiLinkExt = {
        name: 'wikiLink',
        level: 'inline',
        start(src) { return src.match(/\[\[/)?.index; },
        tokenizer(src) {
            const match = /^\[\[([^\]]+)\]\]/.exec(src);
            if (match) return { type: 'wikiLink', raw: match[0], text: match[1].trim() };
        },
        renderer(token) {
            const safeTitle = token.text.replace(/'/g, "\\'"); 
            return `<a href="#" class="wiki-link" onclick="window.openWikiLink('${safeTitle}'); return false;">${token.text}</a>`;
        }
    };

    marked.use({ renderer, extensions: [wikiLinkExt] });
}

function renderPreview() {
    if (!currentNote) { preview.innerHTML = ""; return; }
    preview.innerHTML = (typeof marked !== 'undefined') ? marked.parse(editor.value) : editor.value;
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([preview]).catch(err => console.log(err));
    }
}

// --- 5. EVENT LISTENERS ---

editor.addEventListener("input", () => {
    if (currentNote) { currentNote.content = editor.value; save(); renderPreview(); }
});
titleInput.addEventListener("input", () => {
    if (currentNote) { currentNote.title = titleInput.value; save(); }
});
search.addEventListener("input", () => renderList(search.value.toLowerCase()));
// Quando digitar no campo de tags...
tagsInput.addEventListener("input", () => {
    if (currentNote) {
        // Pega o texto, separa por vírgula e limpa os espaços
        const rawText = tagsInput.value;
        const tagsArray = rawText.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        
        currentNote.tags = tagsArray; // Salva na nota
        save(); // Salva no arquivo
    }
});
if (btnNewNote) btnNewNote.onclick = () => {
    const newNote = { title: "Nota " + new Date().toLocaleTimeString(), content: "" };
    notes.unshift(newNote);
    save(); openNote(newNote); titleInput.focus();
};

if (btnDelete) btnDelete.onclick = () => {
    if (!currentNote) return alert("Selecione uma nota!");
    if (confirm(`Excluir "${currentNote.title}"?`)) {
        notes = notes.filter(n => n !== currentNote);
        currentNote = null; titleInput.value = ""; editor.value = ""; preview.innerHTML = "";
        save(); if (notes.length > 0) openNote(notes[0]);
    }
};

if (toggleBtn) toggleBtn.onclick = () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    toggleBtn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
};

if (btnPdf) btnPdf.onclick = async () => {
    if (!currentNote) return alert("Selecione uma nota");
    await window.electronAPI.exportPDF();
};

if (btnMd) btnMd.onclick = async () => {
    if (!currentNote) return alert("Selecione uma nota");
    await window.electronAPI.exportMD({ title: currentNote.title, content: currentNote.content });
};

if (btnGraph) btnGraph.onclick = () => {
    graphModal.style.display = "flex";
    setTimeout(renderGraph, 50);
};
if (closeGraph) closeGraph.onclick = () => graphModal.style.display = "none";
if (graphModal) graphModal.onclick = (e) => { if (e.target === graphModal) graphModal.style.display = "none"; };

// --- CORREÇÃO: Lógica do Modo Leitura (Faltava aqui) ---
if (btnReader) {
    btnReader.onclick = () => {
        if (!currentNote) return alert("Selecione uma nota!");
        document.body.classList.add("reader-mode");
        renderPreview(); // Re-renderiza para ajustar tabelas/imagens
    };
}

if (btnExitReader) {
    btnExitReader.onclick = () => {
        document.body.classList.remove("reader-mode");
    };
}

// Atalho ESC para sair
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("reader-mode")) {
        document.body.classList.remove("reader-mode");
    }
});

// Colar Imagem
// --- COLAR IMAGEM (CORRIGIDO PARA WINDOWS) ---
editor.addEventListener('paste', async (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image/')) {
            event.preventDefault();
            const buffer = await item.getAsFile().arrayBuffer();
            
            // 1. Salva a imagem no disco e recebe o caminho "bruto" (Ex: C:\Users\...)
            const rawPath = await window.electronAPI.saveImage(buffer);
            
            if (rawPath) {
                // 2. TRUQUE: Converte para URL válida do navegador
                // Troca barras invertidas (\) por normais (/) e adiciona file://
                const safePath = "file://" + rawPath.replace(/\\/g, "/");

                // 3. Insere o Markdown correto no editor
                const text = `![](${safePath})`;
                editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, "end");
                
                // 4. Salva e atualiza
                currentNote.content = editor.value;
                save();
                renderPreview();
            }
        }
    }
});

window.copyToClipboard = (encodedCode, btnElement) => {
    // 1. Decodifica o código original
    const code = decodeURIComponent(escape(atob(encodedCode)));
    
    // 2. Copia para a área de transferência
    navigator.clipboard.writeText(code).then(() => {
        // 3. Feedback visual (Muda o texto do botão)
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = "✅ Copiado!";
        btnElement.classList.add("copied"); // Opcional: para mudar cor no CSS
        
        // 4. Volta ao normal depois de 2 segundos
        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.classList.remove("copied");
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert("Erro ao copiar código!");
    });
};

if (btnPin) {
    btnPin.onclick = () => {
        if (!currentNote) return alert("Selecione uma nota!");
        
        // Inverte o estado (se true vira false, se undefined/false vira true)
        currentNote.pinned = !currentNote.pinned;
        
        save(); // Salva no JSON
        
        // Feedback visual imediato
        btnPin.classList.toggle("active", currentNote.pinned);
        renderList(search.value.toLowerCase());
    };
}
initApp();
