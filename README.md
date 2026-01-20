# gereciador de notas

O Notas de Pensamento é uma aplicação de gestão de conhecimento pessoal (PKM) desenvolvida em Electron. O software opera localmente, oferecendo um ambiente seguro e offline para criação de notas em Markdown, renderização de fórmulas matemáticas (LaTeX), anotação de código e visualização de conexões de conhecimento através de grafos.

## Funcionalidades Principais

* **Editor Markdown Híbrido:** Suporte completo à sintaxe Markdown com pré-visualização em tempo real.
* **Links Bidirecionais (WikiLinks):** Sistema de conexão entre notas utilizando a sintaxe `[[Nome da Nota]]`, permitindo a criação de uma base de conhecimento não linear.
* **Visualização em Grafo:** Renderização visual das conexões entre as notas utilizando nós e arestas, facilitando a identificação de clusters de ideias e notas isoladas.
* **Suporte a LaTeX:** Renderização nativa de equações matemáticas complexas utilizando MathJax.
* **Highlight de Sintaxe:** Realce de sintaxe automático para blocos de código em diversas linguagens de programação.
* **Gestão de Imagens:** Suporte para colar imagens diretamente da área de transferência (Ctrl+V), com salvamento automático local.
* **Persistência de Dados Local:** Todas as notas e imagens são armazenadas em arquivos locais (JSON e assets), garantindo privacidade e acesso offline.
* **Exportação:** Capacidade de exportar notas individuais para o formato PDF formatado.
* **Interface Adaptativa:** Suporte a temas Claro e Escuro com persistência da preferência do usuário.

## Tecnologias Utilizadas

O projeto foi construído utilizando as seguintes tecnologias e bibliotecas:

* **Runtime:** Electron, Node.js
* **Linguagens:** JavaScript (ES6+), HTML5, CSS3
* **Bibliotecas de Terceiros:**
    * `marked`: Conversão de Markdown para HTML.
    * `mathjax`: Renderização de notação matemática.
    * `highlight.js`: Realce de sintaxe para blocos de código.
    * `vis-network`: Visualização de dados em grafo interativo.

## Estrutura do Projeto

A arquitetura de arquivos do projeto está organizada da seguinte forma:

```text
/
├── dados/               # Diretório de persistência de dados
│   ├── imagens/         # Armazenamento de imagens coladas
│   └── notes.json       # Banco de dados local das notas
├── libs/                # Dependências de frontend (copiadas localmente)
├── node_modules/        # Dependências do Node.js
├── app.js               # Lógica de frontend (DOM, renderização, eventos)
├── copiar-libs.js       # Script utilitário para gestão de dependências
├── index.html           # Estrutura principal da interface
├── main.js              # Processo principal do Electron (Backend)
├── preload.js           # Ponte de segurança (ContextBridge)
├── style.css            # Folhas de estilo e temas
└── package.json         # Definições do projeto e dependências
