// --- 1. VARIÁVEIS GLOBAIS ---
let notes = [];
let currentNote = null;

// Elementos Principais
const list = document.getElementById("noteList");
const editor = document.getElementById("editor");
const titleInput = document.getElementById("title");
const preview = document.getElementById("preview");
const search = document.getElementById("search");

// Botões
const btnNewNote = document.getElementById("newNote");
const toggleBtn = document.getElementById("toggleTheme");
const btnPdf = document.getElementById("btnPdf");
const btnGraph = document.getElementById("btnGraph");
const btnDelete = document.getElementById("btnDelete"); // NOVO

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

function renderGraph() {
    console.log("--- Renderizando Grafo ---");

    if (typeof vis === 'undefined') {
        alert("Erro: Biblioteca vis.js não carregada.");
        return;
    }

    if (graphModal.style.display === "none") {
        graphModal.style.display = "flex";
    }

    const nodesData = [];
    const edgesData = [];
    const nodeIds = new Set();

    notes.forEach(note => {
        nodesData.push({
            id: note.title,
            label: note.title,
            value: 10,
            group: 'normal'
        });
        nodeIds.add(note.title.toLowerCase());
    });

    const linkRegex = /\[\[([^\]]+)\]\]/g;
    notes.forEach(source => {
        let match;
        const content = source.content || "";
        linkRegex.lastIndex = 0;
        
        while ((match = linkRegex.exec(content)) !== null) {
            const targetName = match[1].trim();
            const targetExists = [...nodeIds].find(id => id === targetName.toLowerCase());
            
            if (targetExists) {
                const realTarget = notes.find(n => n.title.toLowerCase() === targetExists).title;
                edgesData.push({ from: source.title, to: realTarget });
            }
        }
    });

    const data = {
        nodes: new vis.DataSet(nodesData),
        edges: new vis.DataSet(edgesData)
    };

    const isDark = document.body.classList.contains('dark-mode');
    const options = {
        nodes: {
            shape: 'dot',
            font: { color: isDark ? '#ddd' : '#333', size: 16 },
            scaling: { min: 10, max: 30 }
        },
        edges: {
            color: { color: isDark ? '#555' : '#ccc' },
            arrows: 'to'
        },
        physics: { stabilization: false }
    };

    const network = new vis.Network(networkContainer, data, options);
    
    setTimeout(() => { network.fit(); }, 100);

    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const noteTitle = params.nodes[0];
            const note = notes.find(n => n.title === noteTitle);
            if (note) openNote(note);
            graphModal.style.display = "none";
        }
    });
}

// --- 3. INICIALIZAÇÃO E LÓGICA PRINCIPAL ---

async function initApp() {
    try {
        if (window.electronAPI) {
            notes = await window.electronAPI.loadNotes();
        }
    } catch (e) {
        console.error("Erro ao carregar notas:", e);
    }
    
    if (!Array.isArray(notes)) notes = [];

    const today = new Date().toISOString().split("T")[0];
    let daily = notes.find(n => n.title === today);
    if (!daily) {
        daily = { title: today, content: "# Nota do Dia\n" };
        notes.unshift(daily);
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
    notes.filter(n => n.title.toLowerCase().includes(filter)).forEach(n => {
        const li = document.createElement("li");
        li.textContent = n.title;
        // Destaca a nota selecionada visualmente (opcional)
        if (currentNote && n === currentNote) li.style.fontWeight = "bold";
        
        li.onclick = () => openNote(n);
        list.appendChild(li);
    });
}

function openNote(note) {
    currentNote = note;
    titleInput.value = note.title;
    editor.value = note.content || "";
    renderPreview();
    renderList(search.value.toLowerCase()); // Atualiza para mostrar negrito
}

// --- 4. MARKDOWN & PREVIEW ---
if (typeof marked !== 'undefined') {
    const renderer = new marked.Renderer();

    renderer.code = ({ text, lang }) => {
        const validLang = (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) ? lang : 'plaintext';
        const highlighted = (typeof hljs !== 'undefined') ? hljs.highlight(text, { language: validLang }).value : text;
        return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
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
    if (!currentNote) {
        preview.innerHTML = "";
        return;
    }
    
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

// Botão Nova Nota
if (btnNewNote) {
    btnNewNote.onclick = () => {
        const name = "Nota " + new Date().toLocaleTimeString();
        const newNote = { title: name, content: "" };
        notes.unshift(newNote);
        save();
        openNote(newNote);
        titleInput.focus();
    };
}

// Botão Excluir (NOVO)
if (btnDelete) {
    btnDelete.onclick = () => {
        if (!currentNote) return alert("Selecione uma nota para excluir!");

        if (confirm(`Tem certeza que deseja excluir "${currentNote.title}"?`)) {
            // Remove a nota da lista
            notes = notes.filter(n => n !== currentNote);
            
            // Limpa a seleção atual
            currentNote = null;
            titleInput.value = "";
            editor.value = "";
            preview.innerHTML = "";
            
            // Salva e atualiza a lista
            save();
            
            // Se ainda houver notas, abre a primeira para não ficar vazio
            if (notes.length > 0) openNote(notes[0]);
        }
    };
}

// Tema
if (toggleBtn) {
    toggleBtn.onclick = () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        toggleBtn.textContent = isDark ? "☀️" : "🌙";
    };
}

// PDF
if (btnPdf) {
    btnPdf.onclick = async () => {
        if (!currentNote) return alert("Selecione uma nota");
        await window.electronAPI.exportPDF();
    };
}

// Grafo
if (btnGraph) {
    btnGraph.onclick = () => {
        graphModal.style.display = "flex";
        setTimeout(renderGraph, 50);
    };
}

if (closeGraph) closeGraph.onclick = () => graphModal.style.display = "none";
if (graphModal) {
    graphModal.onclick = (e) => {
        if (e.target === graphModal) graphModal.style.display = "none";
    };
}

// Colar Imagem
editor.addEventListener('paste', async (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image/')) {
            event.preventDefault();
            const buffer = await item.getAsFile().arrayBuffer();
            const path = await window.electronAPI.saveImage(buffer);
            if (path) {
                const text = `![](${path})`;
                editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, "end");
                currentNote.content = editor.value;
                save();
                renderPreview();
            }
        }
    }
});

// Inicia
initApp();