const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadNotes: () => ipcRenderer.invoke('load-notes'),
    saveNotes: (notes) => ipcRenderer.send('save-notes', notes),
    exportMD: (data) => ipcRenderer.invoke('export-md', data),
    //a linha de baixo executa código
    runCode: (data) => ipcRenderer.invoke('run-code', data),
    
    // NOVO: Função para enviar a imagem
    saveImage: (buffer) => ipcRenderer.invoke('save-image', buffer),
    // NOVO: Função de PDF
    exportPDF: () => ipcRenderer.invoke('export-pdf')
    
});