const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); 

// --- CONFIGURAÇÃO DE ARMAZENAMENTO ---
const appData = app.getPath('appData');
const dataPath = path.join(appData, 'notas-pensamento');
const notesFile = path.join(dataPath, 'notes.json');
const imagesDir = path.join(dataPath, 'imagens');

if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// --- CRIAÇÃO DA JANELA ---
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200, height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, contextIsolation: true, webSecurity: false
        }
    });
    win.setMenuBarVisibility(false);
    win.loadFile('index.html');
};

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- COMUNICAÇÃO (IPC) ---
ipcMain.handle('load-notes', () => {
    try { if (fs.existsSync(notesFile)) return JSON.parse(fs.readFileSync(notesFile, 'utf-8')); } 
    catch (e) { console.error(e); } return [];
});

ipcMain.on('save-notes', (event, notes) => {
    try { fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2)); } catch (e) { console.error(e); }
});

ipcMain.handle('get-inbox', async () => {
    const inboxPath = path.join(appData, 'notas-pensamento', 'inbox.json');
    try { if (fs.existsSync(inboxPath)) return JSON.parse(fs.readFileSync(inboxPath, 'utf-8')); } 
    catch (e) { console.error(e); } return [];
});

ipcMain.handle('delete-inbox-item', async (event, id) => {
    const inboxPath = path.join(appData, 'notas-pensamento', 'inbox.json');
    try {
        if (fs.existsSync(inboxPath)) {
            let inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));
            inbox = inbox.filter(item => item.id !== id);
            fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
            return true;
        }
    } catch (e) { console.error(e); } return false;
});

// --- EXECUTAR CÓDIGO (COM MOTOR SWISH LOCAL PARA PROLOG) ---
ipcMain.handle('run-code', async (event, { language, code }) => {
    const tempDir = app.getPath('temp'); 
    let command = '';
    let fileName = '';
    let queryFile = ''; // Usado especificamente pelo Prolog

    if (language === 'javascript' || language === 'js') {
        fileName = path.join(tempDir, `temp_script_${Date.now()}.js`);
        command = `node "${fileName}"`; 
        fs.writeFileSync(fileName, code);

    } else if (language === 'python' || language === 'py') {
        fileName = path.join(tempDir, `temp_script_${Date.now()}.py`);
        command = `python "${fileName}"`; 
        fs.writeFileSync(fileName, code);

    } else if (language === 'haskell' || language === 'hs') {
        fileName = path.join(tempDir, `temp_script_${Date.now()}.hs`);
        command = `runghc "${fileName}"`; 
        fs.writeFileSync(fileName, code);

    } else if (language === 'prolog' || language === 'pl') {
        // --- MOTOR TIPO SWISH ---
        queryFile = path.join(tempDir, `query_${Date.now()}.pl`);
        fileName = path.join(tempDir, `runner_${Date.now()}.pl`);

        // Garante que a query do utilizador termina num ponto
        let safeCode = code.trim();
        if (!safeCode.endsWith('.')) safeCode += '.';
        fs.writeFileSync(queryFile, safeCode);

        // Código Prolog aprimorado: Usa leitura nativa (read_term) para evitar falhas de formatação/quebras de linha
        const wrapperCode = `
:- dynamic solution_found/1.

main :-
    open('${queryFile.replace(/\\/g, '/').replace(/'/g, "\\'")}', read, Stream),
    catch(
        read_term(Stream, Goal, [variable_names(Vars)]),
        ReadError,
        (print_message(error, ReadError), halt(1))
    ),
    close(Stream),
    (   Goal == end_of_file
    ->  writeln('Nenhum código encontrado.'), halt(0)
    ;   true
    ),
    asserta(solution_found(false)),
    catch(
        (
            call(Goal),
            retract(solution_found(_)),
            asserta(solution_found(true)),
            (   Vars == []
            ->  writeln('true')
            ;   print_vars(Vars), nl
            ),
            fail
        ;   true % <--- CORREÇÃO: Garante que o fim do ciclo reporta "sucesso" em vez de "falha" ao sistema operativo
        ),
        ExecError,
        (print_message(error, ExecError), halt(1))
    ),
    (   solution_found(false)
    ->  writeln('false')
    ;   true
    ),
    halt(0).

print_vars([]).
print_vars([Name=Var|Rest]) :-
    (   Rest == []
    ->  format('~w = ~w', [Name, Var])
    ;   format('~w = ~w, ', [Name, Var])
    ),
    print_vars(Rest).
        `;
        
        fs.writeFileSync(fileName, wrapperCode);
        command = `swipl -q -t halt -s "${fileName}" -g main`;

    } else {
        return "Erro: Linguagem não suportada.";
    }

    try {
        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                // Limpeza dos ficheiros temporários para não encher o disco
                try { fs.unlinkSync(fileName); } catch(e){}
                if (queryFile) { try { fs.unlinkSync(queryFile); } catch(e){} }

                // Apanha tanto o output normal como erros invisíveis que o Prolog envie para o stderr
                let finalOut = stdout ? stdout.trim() : '';
                let finalErr = stderr ? stderr.trim() : '';

                if (error) {
                    resolve(`Erro:\n${finalErr || finalOut || error.message}`);
                } else {
                    resolve(finalOut || finalErr || "Sem saída visual.");
                }
            });
        });
    } catch (e) {
        return `Erro interno: ${e.message}`;
    }
});