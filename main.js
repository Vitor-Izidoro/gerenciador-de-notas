const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); // <--- ADICIONE ESTA LINHA
// --- CONFIGURAÇÃO DE ARMAZENAMENTO (CORREÇÃO DO ERRO) ---

// Em vez de usar __dirname (que trava no executável), usamos app.getPath('userData')
// Isso aponta para C:\Users\SeuNome\AppData\Roaming\notas-pensamento
const dataPath = app.getPath('userData');
const notesFile = path.join(dataPath, 'notes.json');
const imagesDir = path.join(dataPath, 'imagens');

// Garante que a pasta de imagens existe
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

console.log("Salvando dados em:", dataPath); // Para você ver onde está salvando

// --- CRIAÇÃO DA JANELA ---
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Necessário para carregar imagens locais do disco
        }
    });

    // Remove o menu padrão (File, Edit...) para ficar mais limpo
    win.setMenuBarVisibility(false);

    win.loadFile('index.html');
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- COMUNICAÇÃO (IPC) ---

// 1. CARREGAR NOTAS
ipcMain.handle('load-notes', () => {
    try {
        if (fs.existsSync(notesFile)) {
            const data = fs.readFileSync(notesFile, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Erro ao ler notas:", error);
    }
    return []; // Retorna lista vazia se não houver arquivo
});

// 2. SALVAR NOTAS
ipcMain.on('save-notes', (event, notes) => {
    try {
        fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2));
    } catch (error) {
        console.error("Erro ao salvar notas:", error);
    }
});

// 3. SALVAR IMAGEM
ipcMain.handle('save-image', async (event, arrayBuffer) => {
    try {
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `img_${Date.now()}.png`;
        const filePath = path.join(imagesDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        
        return filePath; // Retorna o caminho absoluto para o frontend
    } catch (error) {
        console.error("Erro ao salvar imagem:", error);
        return null;
    }
});

// 4. EXPORTAR PDF
ipcMain.handle('export-pdf', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Salvar Nota como PDF',
        defaultPath: 'Nota.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) return false;

    try {
        const data = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { top: 1, bottom: 1, left: 1, right: 1 }
        });
        fs.writeFileSync(filePath, data);
        return true;
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        return false;
    }
});

// 5. EXECUTAR CÓDIGO (Esta é a parte que faltava)
ipcMain.handle('run-code', async (event, { language, code }) => {
    const tempDir = app.getPath('temp'); // Pasta temporária do Windows
    let command = '';
    let fileName = '';

    // Define como rodar cada linguagem
    if (language === 'javascript' || language === 'js') {
        fileName = path.join(tempDir, `temp_script_${Date.now()}.js`);
        command = `node "${fileName}"`; // Usa o Node.js
    } else if (language === 'python' || language === 'py') {
        fileName = path.join(tempDir, `temp_script_${Date.now()}.py`);
        command = `python "${fileName}"`; // Requer Python instalado no Windows
    } else {
        return "Erro: Linguagem não suportada. Use 'javascript' ou 'python'.";
    }

    try {
        // 1. Cria um arquivo temporário com o código
        fs.writeFileSync(fileName, code);

        // 2. Executa o comando e espera a resposta
        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                // Limpa o arquivo temporário
                try { fs.unlinkSync(fileName); } catch(e){}

                if (error) {
                    resolve(`Erro:\n${stderr || error.message}`);
                } else {
                    resolve(stdout || "Código executado (sem saída visual).");
                }
            });
        });

    } catch (e) {
        return `Erro interno: ${e.message}`;
    }
});

// 6. EXPORTAR MARKDOWN (Recomendo adicionar de volta também, pois é útil)
ipcMain.handle('export-md', async (event, { title, content }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Exportar Markdown',
        defaultPath: `${title}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
});