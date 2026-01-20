const fs = require('fs');
const path = require('path');

const libsDir = path.join(__dirname, 'libs');
if (!fs.existsSync(libsDir)) fs.mkdirSync(libsDir);

console.log("--- Atualizando bibliotecas ---");

// Função auxiliar para copiar arquivos
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✅ Copiado: ${path.basename(dest)}`);
    } else {
        console.error(`❌ Erro: Não encontrado ${src}`);
    }
}

// 1. MARKED
const markedSrc = path.join(__dirname, 'node_modules', 'marked', 'marked.min.js');
const markedSrcAlt = path.join(__dirname, 'node_modules', 'marked', 'lib', 'marked.umd.js');
if (fs.existsSync(markedSrc)) copyFile(markedSrc, path.join(libsDir, 'marked.min.js'));
else if (fs.existsSync(markedSrcAlt)) copyFile(markedSrcAlt, path.join(libsDir, 'marked.min.js'));

// 2. MATHJAX
const mathjaxSrc = path.join(__dirname, 'node_modules', 'mathjax');
const mathjaxDest = path.join(libsDir, 'mathjax');
if (fs.existsSync(mathjaxSrc)) {
    if (fs.existsSync(mathjaxDest)) fs.rmSync(mathjaxDest, { recursive: true, force: true });
    fs.cpSync(mathjaxSrc, mathjaxDest, { recursive: true });
    console.log("✅ MathJax atualizado!");
}

// 3. HIGHLIGHT.JS (Novo!)
const hljsRoot = path.join(__dirname, 'node_modules', '@highlightjs/cdn-assets');
const hljsDest = path.join(libsDir, 'highlight');
if (!fs.existsSync(hljsDest)) fs.mkdirSync(hljsDest);

// Copia o script principal
copyFile(path.join(hljsRoot, 'highlight.min.js'), path.join(hljsDest, 'highlight.min.js'));

// Copia o tema (CSS) - Atom One Dark
copyFile(path.join(hljsRoot, 'styles', 'atom-one-dark.min.css'), path.join(hljsDest, 'style.css'));


// 4. VIS-NETWORK (Gráficos)
const visSrc = path.join(__dirname, 'node_modules', 'vis-network', 'standalone', 'umd', 'vis-network.min.js');
const visDest = path.join(libsDir, 'vis-network.min.js');

if (fs.existsSync(visSrc)) {
    copyFile(visSrc, visDest);
} else {
    console.error("❌ Vis-Network não encontrado. (npm install vis-network)");
}