const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// --- MUDANÇA AQUI ---
// Define o caminho para uma pasta 'dados' DENTRO do seu projeto
const notesDir = path.join(__dirname, 'dados');
const dataPath = path.join(notesDir, 'notes.json');

// Garante que a pasta 'dados' existe. Se não existir, cria ela.
if (!fs.existsSync(notesDir)){
    fs.mkdirSync(notesDir);
}
// --------------------

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

ipcMain.handle('load-notes', async () => {
    try {
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error("Erro ao ler notas:", error);
        return [];
    }
});

ipcMain.on('save-notes', (event, notes) => {
    // Agora salva dentro da pasta do projeto
    fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2));
});

// ... (código anterior do main.js) ...

// --- NOVA FUNÇÃO: SALVAR IMAGEM COLADA ---
ipcMain.handle('save-image', async (event, arrayBuffer) => {
    try {
        // 1. Define a pasta de imagens dentro de 'dados'
        const imagesDir = path.join(notesDir, 'imagens');
        
        // 2. Garante que a pasta existe
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir);
        }

        // 3. Cria um nome único (ex: img_1715000000.png)
        const fileName = `img_${Date.now()}.png`;
        const filePath = path.join(imagesDir, fileName);

        // 4. Converte o buffer e salva o arquivo
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(filePath, buffer);

        // 5. Retorna o caminho relativo para o Markdown usar
        // No Windows precisamos inverter as barras para funcionar no HTML
        return `dados/imagens/${fileName}`.replace(/\\/g, '/');
    } catch (error) {
        console.error("Erro ao salvar imagem:", error);
        return null;
    }
});

// --- EXPORTAR PDF ---
ipcMain.handle('export-pdf', async (event) => {
    // Pega a janela que enviou o comando
    const win = BrowserWindow.fromWebContents(event.sender);

    // 1. Abre janela para escolher onde salvar
    const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Salvar Nota como PDF',
        defaultPath: 'Nota.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    // Se o usuário cancelou, para tudo
    if (!filePath) return false;

    try {
        // 2. Gera o PDF baseado no CSS @media print
        const data = await win.webContents.printToPDF({
            printBackground: true, // Imprime cores de fundo (se houver)
            pageSize: 'A4',
            margins: { top: 1, bottom: 1, left: 1, right: 1 } // Margens em cm (aprox)
        });

        // 3. Salva o arquivo no disco
        fs.writeFileSync(filePath, data);
        return true;
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        return false;
    }
});


// ... (app.whenReady e resto do código) ...

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

