
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  FileCode, 
  History, 
  Sparkles, 
  UploadCloud, 
  DownloadCloud, 
  FolderOpen, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  CheckSquare, 
  Square, 
  X, 
  BookOpen, 
  ArrowRight, 
  HelpCircle, 
  EyeOff, 
  GitMerge, 
  AlertTriangle, 
  RefreshCw, 
  Split, 
  ChevronDown, 
  Play, 
  Layers, 
  ShieldAlert, 
  FilePlus, 
  Globe, 
  Lock, 
  Server, 
  Link as LinkIcon, 
  Trash2, 
  Eye, 
  Bot, 
  Cpu, 
  MonitorPlay, 
  Code2, 
  MessageSquare, 
  Send, 
  BrainCircuit, 
  Search, 
  Undo2, 
  FileDiff,
  RotateCcw,
  Copy,
  MoreHorizontal,
  Database,
  GitPullRequest,
  PlusCircle,
  CornerDownRight,
  Monitor,
  Tag,
  HardDrive,
  Wrench
} from 'lucide-react';
import { ICommit, IRepoState, FileStatus, IContextMenu, TaskType } from './types';
import { generateSmartCommitMessage, askGitMentorWithSearch, shapeProject, IAiGeneratedFile, streamChatResponse, explainChanges } from './services/geminiService';
import { gitQueue } from './services/gitQueue';
import { NexusDB } from './services/sqliteService';

// --- Initial Mock Data (Enriched for Graph) ---
const INITIAL_FILES = {
  'README.md': '# NexusVC Enterprise\n\nProjeto vinculado ao GitHub Corporativo.\nUtilize o menu de contexto (botão direito) para operações.',
  'app.config.ts': 'export const config = {\n  apiUrl: "https://api.empresa.com/v1",\n  timeout: 5000\n}',
  'service.js': 'function connect() {\n  console.log("Connecting to legacy system...");\n}',
  'index.html': '<!DOCTYPE html>\n<html>\n<head>\n<title>Nexus App</title>\n<style>\n  body { font-family: sans-serif; padding: 20px; }\n  h1 { color: #333; }\n</style>\n</head>\n<body>\n  <h1>Bem-vindo ao NexusVC</h1>\n  <p>Edite este arquivo ou use o Arquiteto IA.</p>\n</body>\n</html>',
  'debug.log': '[INFO] System started...'
};

const INITIAL_COMMIT_ID = 'a1b2c3d';

// Mocking a graph structure
const INITIAL_REPO_STATE: IRepoState = {
  currentBranch: 'master',
  files: { ...INITIAL_FILES },
  originalFiles: { ...INITIAL_FILES },
  fileStatuses: {}, // Initial cache empty
  commits: [
    {
      id: 'd5e6f7g',
      message: 'fix: critical bug in login',
      author: 'Senior Dev',
      timestamp: Date.now() - 1800000,
      changes: {},
      parent: 'c9d8e7f',
      lane: 2
    },
    {
      id: 'c9d8e7f',
      message: 'Merge branch \'feature/auth\'',
      author: 'System Admin',
      timestamp: Date.now() - 3600000,
      changes: {},
      parent: 'a1b2c3d',
      secondaryParent: 'b2c3d4e',
      lane: 0
    },
    {
      id: 'b2c3d4e',
      message: 'feat: implement login',
      author: 'Dev Junior',
      timestamp: Date.now() - 7200000,
      changes: {},
      parent: 'a1b2c3d',
      lane: 1
    },
    {
      id: INITIAL_COMMIT_ID,
      message: 'Initial commit',
      author: 'System Admin',
      timestamp: Date.now() - 172800000,
      changes: { ...INITIAL_FILES },
      parent: null,
      lane: 0,
      tags: ['v0.1']
    }
  ],
  remoteCommits: [],
  branches: [
    { name: 'master', headCommitId: 'c9d8e7f', remoteHeadCommitId: 'c9d8e7f' },
    { name: 'feature/ui-refresh', headCommitId: INITIAL_COMMIT_ID, remoteHeadCommitId: INITIAL_COMMIT_ID }
  ],
  remotes: [], // Will be loaded from DB
  github: {
    connected: false,
    repoUrl: '',
    username: '',
    token: ''
  },
  gitIgnore: ['*.log'],
  mergeState: {
    isMerging: false,
    conflicts: [],
    theirs: {}
  }
};

// --- Module 5: 3-Way Merge Component ---
const ThreeWayMergeViewer = ({ 
    filename, 
    ours, 
    theirs, 
    result, 
    onResultChange 
}: { 
    filename: string, 
    ours: string, 
    theirs: string, 
    result: string, 
    onResultChange: (val: string) => void 
}) => {
    return (
        <div className="flex flex-col h-full">
            <div className="bg-orange-50 border-b border-orange-200 p-2 text-orange-800 text-xs flex items-center gap-2 font-bold">
                <AlertTriangle size={14}/>
                Modo de Resolução: {filename}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-200 p-1 overflow-hidden">
                {/* Panel 1: Ours (HEAD) */}
                <div className="bg-white flex flex-col border border-slate-300 rounded">
                    <div className="bg-blue-50 p-1 text-xs font-bold text-blue-800 text-center border-b border-blue-100">
                        Nosso (HEAD)
                    </div>
                    <textarea readOnly className="flex-1 p-2 text-xs font-mono resize-none outline-none text-slate-600 bg-slate-50" value={ours}></textarea>
                </div>

                {/* Panel 2: Result (Center - Editable) */}
                <div className="bg-white flex flex-col border-2 border-orange-400 rounded shadow-lg z-10">
                     <div className="bg-orange-100 p-1 text-xs font-bold text-orange-900 text-center border-b border-orange-200 flex justify-between px-2">
                        <span>Resultado Final</span>
                        <span className="text-[10px] bg-white px-1 rounded border border-orange-200">Editável</span>
                    </div>
                    {/* Auto-Solve Tools */}
                    <div className="flex justify-center gap-1 p-1 bg-slate-50 border-b border-slate-200">
                        <button onClick={() => onResultChange(ours)} className="text-[10px] px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-200">Usar Nosso</button>
                        <button onClick={() => onResultChange(theirs)} className="text-[10px] px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded border border-green-200">Usar Deles</button>
                        <button onClick={() => onResultChange(`${ours}\n${theirs}`)} className="text-[10px] px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-200">Ambos</button>
                    </div>
                    <textarea 
                        className="flex-1 p-2 text-xs font-mono resize-none outline-none text-slate-800" 
                        value={result}
                        onChange={(e) => onResultChange(e.target.value)}
                    ></textarea>
                </div>

                 {/* Panel 3: Theirs (Remote) */}
                 <div className="bg-white flex flex-col border border-slate-300 rounded">
                    <div className="bg-green-50 p-1 text-xs font-bold text-green-800 text-center border-b border-green-100">
                        Deles (Incoming)
                    </div>
                    <textarea readOnly className="flex-1 p-2 text-xs font-mono resize-none outline-none text-slate-600 bg-slate-50" value={theirs}></textarea>
                </div>
            </div>
        </div>
    )
}

// --- New Component: Diff Viewer (Unified Diff Style) ---
const DiffViewer = ({ 
    filename, 
    original, 
    modified, 
    onClose 
}: { 
    filename: string, 
    original: string, 
    modified: string, 
    onClose: () => void 
}) => {
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExplain = async () => {
        setLoading(true);
        const text = await explainChanges(filename, original, modified);
        setExplanation(text);
        setLoading(false);
    }

    // Calculate Unified Diff using LCS (Longest Common Subsequence)
    const diffChanges = useMemo(() => {
        const oldLines = original.split('\n');
        const newLines = modified.split('\n');
        const N = oldLines.length;
        const M = newLines.length;
        
        // DP Matrix for LCS
        const dp = new Int32Array((N + 1) * (M + 1));
        const getDp = (i: number, j: number) => dp[i * (M + 1) + j];
        const setDp = (i: number, j: number, val: number) => dp[i * (M + 1) + j] = val;

        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= M; j++) {
                if (oldLines[i - 1] === newLines[j - 1]) {
                    setDp(i, j, getDp(i - 1, j - 1) + 1);
                } else {
                    setDp(i, j, Math.max(getDp(i - 1, j), getDp(i, j - 1)));
                }
            }
        }

        // Backtrack to find changes
        let i = N, j = M;
        const changes = [];
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
                // Equal
                changes.push({ type: ' ', content: oldLines[i - 1], oldLn: i, newLn: j });
                i--; j--;
            } else if (j > 0 && (i === 0 || getDp(i, j - 1) >= getDp(i - 1, j))) {
                // Addition
                changes.push({ type: '+', content: newLines[j - 1], newLn: j });
                j--;
            } else {
                // Deletion
                changes.push({ type: '-', content: oldLines[i - 1], oldLn: i });
                i--;
            }
        }
        return changes.reverse();
    }, [original, modified]);

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-2 border-b flex justify-between items-center bg-slate-100 shadow-sm">
                 <span className="font-bold text-sm flex items-center gap-2 text-slate-700">
                    <FileDiff size={16} className="text-blue-600"/> Diff: {filename}
                 </span>
                 <div className="flex gap-2">
                    <button 
                        onClick={handleExplain} 
                        className="text-purple-700 text-xs font-bold flex items-center gap-1 px-3 py-1 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={12}/> : <Sparkles size={12}/>} 
                        Explicar com IA
                    </button>
                    <button onClick={onClose} className="text-slate-500 hover:text-red-600 transition-colors"><X size={18}/></button>
                 </div>
            </div>
            
            {explanation && (
                <div className="bg-purple-50 p-3 border-b border-purple-100 text-xs text-slate-800 leading-relaxed animate-in fade-in slide-in-from-top-2">
                    <strong className="text-purple-800 block mb-1">🤖 Análise do Gemini:</strong> 
                    {explanation}
                </div>
            )}

            <div className="flex-1 overflow-auto font-mono text-xs bg-slate-50 p-4">
                 <div className="border border-slate-300 rounded bg-white overflow-hidden shadow-sm">
                    <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 text-slate-600 font-bold text-[10px] flex justify-between items-center">
                        <span>git diff a/{filename} b/{filename}</span>
                        <span className="text-[9px] bg-slate-200 px-1 rounded text-slate-500">Unified View</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {diffChanges.map((item, idx) => {
                            let bg = 'bg-white';
                            let text = 'text-slate-700';
                            
                            if (item.type === '+') { 
                                bg = 'bg-green-50'; 
                                text = 'text-green-700'; 
                            }
                            if (item.type === '-') { 
                                bg = 'bg-red-50'; 
                                text = 'text-red-700'; 
                            }

                            return (
                                <div key={idx} className={`flex ${bg} ${text} hover:opacity-90`}>
                                    {/* Line Numbers */}
                                    <div className="w-8 text-right pr-1 select-none text-slate-400 border-r border-slate-200 mr-2 text-[10px] py-0.5 flex-shrink-0">
                                        {item.oldLn || ' '}
                                    </div>
                                    <div className="w-8 text-right pr-1 select-none text-slate-400 border-r border-slate-200 mr-2 text-[10px] py-0.5 flex-shrink-0">
                                        {item.newLn || ' '}
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 whitespace-pre-wrap break-all py-0.5 flex">
                                        <span className="w-4 select-none opacity-50 text-center inline-block font-bold">{item.type}</span>
                                        <span>{item.content}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>
            </div>
        </div>
    )
}

// --- Module 3: Graph Visualization (Strictly Orthogonal / Square Style) ---
const GitGraph = ({ 
    commits, 
    onRowContextMenu,
    onReset 
}: { 
    commits: ICommit[], 
    onRowContextMenu: (e: React.MouseEvent, commitId: string) => void,
    onReset: (id: string) => void
}) => {
    // Configuração para visual "Square" (Tortoise/GitExtensions style)
    const ROW_HEIGHT = 40;
    const COL_WIDTH = 20;
    const OFFSET_X = 24;
    const NODE_RADIUS = 4;

    // Função auxiliar para gerar cores por lane
    const getLaneColor = (lane: number) => {
        const colors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];
        return colors[lane % colors.length];
    };

    return (
        <div className="relative w-full pb-12 select-none font-mono text-sm bg-white">
            {commits.map((commit, idx) => {
                const lane = commit.lane || 0;
                const cx = OFFSET_X + (lane * COL_WIDTH);
                const cy = 20; // Centralizado verticalmente na linha (ROW_HEIGHT / 2)

                const parent = commits.find(c => c.id === commit.parent);
                const secParent = commits.find(c => c.id === commit.secondaryParent);
                
                let lines = [];

                // 1. Conexão com Pai Primário (Square/Orthogonal)
                if (parent) {
                    const parentLane = parent.lane || 0;
                    const px = OFFSET_X + (parentLane * COL_WIDTH);
                    
                    // Cor da linha segue a cor do filho (commit atual)
                    const strokeColor = getLaneColor(lane);

                    if (lane === parentLane) {
                        // Linha reta vertical
                        lines.push(
                            <path 
                                key={`p-${commit.id}`} 
                                d={`M ${cx} ${cy} L ${cx} ${ROW_HEIGHT + cy}`} // Estende até o próximo bloco
                                stroke={strokeColor} 
                                strokeWidth="2" 
                            />
                        );
                    } else {
                        // Ramificação Ortogonal (Branching)
                        // Desenha um "L" ou degrau: Desce metade, vai para o lado, desce resto
                        const midY = cy + (ROW_HEIGHT / 2);
                        
                        // Lógica: Sai do Commit -> Desce um pouco -> Vira horizontal -> Vai até a lane do pai -> Desce
                        lines.push(
                            <path 
                                key={`fork-${commit.id}`} 
                                d={`M ${cx} ${cy} L ${cx} ${midY} L ${px} ${midY} L ${px} ${ROW_HEIGHT + 20}`} 
                                fill="none" 
                                stroke={strokeColor} 
                                strokeWidth="2"
                            />
                        );
                        
                        // Marcador Quadrado no "Cotovelo" (Junction Point)
                        // Indica visualmente onde a branch "nasce" ou conecta
                        lines.push(
                            <rect 
                                key={`elbow-${commit.id}`}
                                x={px - 3}
                                y={midY - 3}
                                width={6}
                                height={6}
                                fill={strokeColor}
                            />
                        );
                    }
                }

                // 2. Conexão com Pai Secundário (Merge)
                if (secParent) {
                    const secLane = secParent.lane || 0;
                    const sx = OFFSET_X + (secLane * COL_WIDTH);
                    const midY = cy + 10; // Pequeno offset para não sobrepor totalmente
                    
                    lines.push(
                         <path 
                            key={`merge-${commit.id}`} 
                            d={`M ${cx} ${cy} L ${cx} ${midY} L ${sx} ${midY} L ${sx} ${ROW_HEIGHT + 20}`} 
                            fill="none" 
                            stroke="#64748b" // Cor neutra para merge line secundária
                            strokeWidth="1.5"
                            strokeDasharray="2 2"
                        />
                    );
                    // Marcador de Merge
                    lines.push(
                        <rect key={`mk-merge-${commit.id}`} x={sx - 2} y={midY - 2} width={4} height={4} fill="#64748b" />
                    );
                }

                return (
                    <div 
                        key={commit.id} 
                        className="flex h-10 items-center hover:bg-blue-50 group transition-colors px-2 relative border-b border-slate-100"
                        style={{ height: ROW_HEIGHT }}
                        // CRUCIAL: e.stopPropagation impede que o clique borbulhe para a div principal
                        // Isso garante que o menu de contexto do commit abra, não o genérico
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); 
                            onRowContextMenu(e, commit.id);
                        }}
                    >
                        {/* Área do SVG (Linhas e Pontos) */}
                        <div className="w-40 flex-shrink-0 relative h-full overflow-visible" style={{ minWidth: '160px' }}>
                             <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                {lines}
                                {/* Commit Node (Quadrado ou Circulo preenchido) */}
                                <rect 
                                    x={cx - 5} 
                                    y={cy - 5} 
                                    width={10} 
                                    height={10} 
                                    fill={getLaneColor(lane)} 
                                    stroke="white" 
                                    strokeWidth="2" 
                                    rx="2" // Levemente arredondado para ficar elegante mas "quadrado"
                                />
                             </svg>
                        </div>

                        {/* Info do Commit */}
                         <div className="flex-1 flex items-center gap-3 h-full pr-4 overflow-hidden cursor-default">
                             <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 min-w-[60px] text-center">
                                 {commit.id.substring(0, 7)}
                             </span>
                             
                             <span className="flex-1 text-xs font-medium text-slate-700 truncate flex items-center gap-2">
                                 {commit.message}
                                 {commit.tags && commit.tags.map(t => (
                                     <span key={t} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[9px] font-bold rounded border border-yellow-200 flex items-center shadow-sm">
                                         <Tag size={8} className="mr-1"/>{t}
                                     </span>
                                 ))}
                             </span>

                             <span className="text-[10px] text-slate-500 w-32 truncate flex items-center gap-1">
                                 <span className={`w-2 h-2 rounded-full bg-[${getLaneColor(lane)}]`}></span>
                                 {commit.author}
                             </span>

                             <span className="text-[10px] text-slate-400 w-24 text-right font-mono border-l border-slate-100 pl-2">
                                 {new Date(commit.timestamp).toLocaleDateString()}
                             </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// --- New Component: Live Preview ---
const LivePreview = ({ files }: { files: Record<string, string> }) => {
    const [srcDoc, setSrcDoc] = useState('');

    useEffect(() => {
        // Simple logic: If index.html exists, serve it. 
        // Try to inline CSS/JS if found (very basic implementation for demo).
        let html = files['index.html'] || '<div style="font-family:sans-serif; padding:20px; color:#666;">Nenhum index.html encontrado para visualização.</div>';
        
        // Basic Injection for style.css
        if (files['style.css']) {
            html = html.replace('</head>', `<style>${files['style.css']}</style></head>`);
        }
        // Basic Injection for app.js / script.js
        if (files['script.js']) {
            html = html.replace('</body>', `<script>${files['script.js']}</script></body>`);
        }

        setSrcDoc(html);
    }, [files]);

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-300 shadow-xl">
            <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-2"><MonitorPlay size={14}/> Live Preview (Simulador)</span>
                <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded">localhost:3000</span>
            </div>
            <div className="flex-1 bg-slate-100 relative">
                <iframe 
                    title="preview"
                    srcDoc={srcDoc}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                />
            </div>
        </div>
    );
}

// --- New Component: Chatbot ---
const Chatbot = ({ 
    files, 
    onUpdateFile 
}: { 
    files: Record<string, string>, 
    onUpdateFile: (filename: string, content: string) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: string, text: string, type?: 'text' | 'tool'}[]>([
        { role: 'model', text: 'Olá! Sou o assistente virtual NexusVC. Posso ajudar com comandos Git ou editar seus arquivos diretamente. O que deseja fazer?', type: 'text' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg, type: 'text' }]);
        setIsLoading(true);

        try {
            // Prepare history for API (Text only for context)
            const history = messages.filter(m => m.type !== 'tool').map(m => ({
                role: m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));

            const stream = streamChatResponse(history, userMsg, files);
            
            // Add a placeholder for the model response
            setMessages(prev => [...prev, { role: 'model', text: '', type: 'text' }]);
            
            let fullResponse = "";
            let hasToolCall = false;

            for await (const chunk of stream) {
                if (chunk.toolCall) {
                    hasToolCall = true;
                    if (chunk.toolCall.name === 'update_file') {
                        // Execute Tool
                        const { filename, content, reasoning } = chunk.toolCall.args;
                        onUpdateFile(filename, content);
                        
                        // Update UI to show action
                        setMessages(prev => {
                            const newArr = [...prev];
                            // Remove empty thinking bubble if exists
                            if (newArr[newArr.length - 1].text === '') newArr.pop();
                            
                            // Add Tool Execution Message
                            newArr.push({ 
                                role: 'model', 
                                text: `✅ Alteração aplicada em '${filename}': ${reasoning}`, 
                                type: 'tool' 
                            });
                            return newArr;
                        });
                    }
                }
                
                if (chunk.text) {
                    fullResponse += chunk.text;
                    setMessages(prev => {
                        const newArr = [...prev];
                        // Update the last message if it's a text message
                        if (newArr[newArr.length - 1].type === 'text') {
                             newArr[newArr.length - 1].text = fullResponse;
                        } else if (!hasToolCall) {
                             // Recovery if we popped the text bubble
                             newArr.push({ role: 'model', text: fullResponse, type: 'text' });
                        }
                        return newArr;
                    });
                }
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro na comunicação.', type: 'text' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-105 z-50 flex items-center gap-2"
            >
                <MessageSquare size={24} />
                <span className="font-bold pr-2">Ajuda AI</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-8 right-8 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden">
            <div className="bg-slate-800 p-3 text-white flex justify-between items-center shadow-md">
                <div className="flex flex-col">
                    <span className="font-bold flex items-center gap-2"><Bot size={18}/> Nexus Agent</span>
                    <span className="text-[10px] text-slate-300 flex items-center gap-1"><Wrench size={10}/> Acesso de Escrita Ativo</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-slate-700 p-1 rounded"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.type === 'tool' ? (
                            <div className="max-w-[90%] p-2 rounded bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
                                <Wrench size={14}/> {m.text}
                            </div>
                        ) : (
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${
                                m.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                            }`}>
                                {m.text}
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && <div className="text-xs text-slate-400 ml-2 animate-pulse flex items-center gap-1"><Sparkles size={10}/> Processando...</div>}
            </div>
            <div className="p-3 border-t border-slate-200 flex gap-2 bg-white">
                <input 
                    className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ex: Adicione um botão vermelho no index.html"
                />
                <button onClick={handleSend} disabled={isLoading} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors">
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default function App() {
  // --- State ---
  const [repo, setRepo] = useState<IRepoState>(INITIAL_REPO_STATE);
  const [selectedFile, setSelectedFile] = useState<string>('index.html');
  const [viewMode, setViewMode] = useState<'explorer' | 'commit' | 'log' | 'settings' | 'mentor' | 'merge' | 'task_wizard' | 'architect' | 'preview' | 'diff'>('explorer');
  const [diffFile, setDiffFile] = useState<string | null>(null);
  
  // Async Queue State
  const [isBusy, setIsBusy] = useState(false);
  const [currentTaskName, setCurrentTaskName] = useState('');

  // Sync State
  const [useRebase, setUseRebase] = useState(true);
  
  // Commit Dialog
  const [commitMessage, setCommitMessage] = useState('');
  const [filesToCommit, setFilesToCommit] = useState<Record<string, boolean>>({});
  const [isAmend, setIsAmend] = useState(false);
  
  // Settings
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [remoteNameInput, setRemoteNameInput] = useState('origin');
  
  // AI Mentor
  const [mentorQuery, setMentorQuery] = useState('');
  const [mentorResponse, setMentorResponse] = useState<{text: string, sources: string[]} | null>(null);
  const [isMentorSearching, setIsMentorSearching] = useState(false);
  
  // AI Architect
  const [architectPrompt, setArchitectPrompt] = useState('');
  const [proposedChanges, setProposedChanges] = useState<IAiGeneratedFile[]>([]);
  const [isArchitectWorking, setIsArchitectWorking] = useState(false);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<IContextMenu>({ visible: false, x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Task Wizard State
  const [taskType, setTaskType] = useState<TaskType>('feature');
  const [taskName, setTaskName] = useState('');

  // --- Initialization: Connect to Embedded DB ---
  useEffect(() => {
      NexusDB.connect();
      // Load Remotes from SQLite (Simulated)
      const cachedRemotes = NexusDB.remotes.getAll();
      if (cachedRemotes.length > 0) {
          setRepo(prev => ({
              ...prev,
              remotes: cachedRemotes.map(r => ({ name: r.name, url: r.url })),
              github: { ...prev.github, connected: true, repoUrl: cachedRemotes[0]?.url }
          }));
      }
  }, []);

  // --- Queue Listener ---
  useEffect(() => {
      gitQueue.setStatusListener((busy, task) => {
          setIsBusy(busy);
          if (task) setCurrentTaskName(task);
      });
  }, []);

  // --- Logic: File Watcher & Porcelain Simulator (Updates Cache) ---
  useEffect(() => {
    // 1. Simulator: "git status --porcelain -z"
    const simulateGitStatusPorcelainZ = (): string => {
      const buffer: string[] = [];
      const allKeys = new Set([...Object.keys(repo.files), ...Object.keys(repo.originalFiles)]);
      
      allKeys.forEach(file => {
          const isIgnored = repo.gitIgnore.some(p => p.startsWith('*') ? file.endsWith(p.slice(1)) : file === p);
          const inWork = repo.files[file];
          const inHead = repo.originalFiles[file];
          
          if (repo.mergeState.conflicts.includes(file)) {
              buffer.push(`UU ${file}`);
          } else if (inWork !== undefined && inHead === undefined) {
              if (!isIgnored) buffer.push(`?? ${file}`);
          } else if (inWork === undefined && inHead !== undefined) {
              buffer.push(` D ${file}`);
          } else if (inWork !== inHead) {
              buffer.push(` M ${file}`);
          }
      });
      
      return buffer.join('\0');
    };

    const parseStatus = (raw: string): Record<string, FileStatus> => {
        const result: Record<string, FileStatus> = {};
        if (!raw) return result;
        
        const tokens = raw.split('\0');
        tokens.forEach(token => {
            if (token.length < 3) return;
            const code = token.substring(0, 2);
            const filename = token.substring(3);
            switch(code) {
                case '??': result[filename] = FileStatus.Untracked; break;
                case ' M': result[filename] = FileStatus.Modified; break;
                case ' D': result[filename] = FileStatus.Modified; break; 
                case 'UU': result[filename] = FileStatus.Conflicted; break;
            }
        });
        return result;
    };

    const rawOutput = simulateGitStatusPorcelainZ();
    const newStatuses = parseStatus(rawOutput);

    // 3. Update State & DB Cache
    setRepo(prev => {
        if (JSON.stringify(prev.fileStatuses) === JSON.stringify(newStatuses)) return prev;
        
        // Update SQLite Cache for Overlay Icons (simulating Tortoise behavior)
        Object.keys(newStatuses).forEach(file => {
             NexusDB.cache.upsert(file, newStatuses[file]);
        });

        return { ...prev, fileStatuses: newStatuses };
    });

  }, [repo.files, repo.originalFiles, repo.gitIgnore, repo.mergeState.conflicts]);


  // --- Logic: Status Accessor ---
  const getFileStatus = (filename: string): FileStatus => {
    // Priority 1: Check Memory Cache
    if (repo.fileStatuses[filename]) return repo.fileStatuses[filename];

    // Priority 1.5: Check Embedded DB Cache (Simulating TSVNCache)
    // Note: In a real React app this would be async, but we cheat with LocalStorage for the demo
    const cachedStatus = NexusDB.cache.get(filename);
    if (cachedStatus) return cachedStatus as FileStatus;

    // Priority 2: Check ignored
    const isIgnored = repo.gitIgnore.some(pattern => {
      if (pattern.startsWith('*')) return filename.endsWith(pattern.slice(1));
      return filename === pattern;
    });
    if (isIgnored) return FileStatus.Ignored;

    return FileStatus.Unmodified;
  };

  // --- Event Handlers ---
  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleRightClick = (e: React.MouseEvent, filename?: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetFile: filename
    });
  };

  // --- Module 0 & 5: Sync Operations with Queue ---

  const handlePull = () => {
      gitQueue.enqueue('Baixando do Remote (Pull)', async () => {
          await new Promise(r => setTimeout(r, 1500));
          const cmd = useRebase ? 'git pull --rebase' : 'git pull';
          alert(`[Gerenciador de Processo] Executado: ${cmd} origin ${repo.currentBranch}\nSucesso.\n(Mock: Alterações remotas mescladas)`);
      });
  };

  const handlePush = () => {
      const remote = repo.remotes.find(r => r.name === 'origin');
      if (!remote) {
          alert("Erro: Remote 'origin' não configurado. Adicione um remote nas configurações.");
          return;
      }

      gitQueue.enqueue('Enviando para Remote (Push)', async () => {
          await new Promise(r => setTimeout(r, 2000)); // Simulate network

          const currentBranchObj = repo.branches.find(b => b.name === repo.currentBranch);
          if (!currentBranchObj) throw new Error("Head detached");

          if (currentBranchObj.headCommitId === currentBranchObj.remoteHeadCommitId) {
              alert("Tudo atualizado (Everything up-to-date)");
              return;
          }

          try {
              const isNonFastForward = Math.random() < 0.1; 

              if (isNonFastForward) {
                  throw new Error("rejected - non-fast-forward");
              }

              setRepo(prev => {
                  const updatedBranches = prev.branches.map(b => 
                      b.name === prev.currentBranch 
                          ? { ...b, remoteHeadCommitId: b.headCommitId } 
                          : b
                  );
                  return {
                      ...prev,
                      branches: updatedBranches
                  };
              });

              alert(`[Sucesso] Enviado ${repo.currentBranch} para ${remote.url}\nRemote Ref atualizado para ${currentBranchObj.headCommitId?.substring(0,7)}`);

          } catch (error: any) {
              if (error.message.includes('non-fast-forward')) {
                  const shouldPull = confirm(
                      `[Erro Git] Push rejeitado: non-fast-forward.\n\n` +
                      `O repositório remoto contém alterações que você não possui localmente.\n` +
                      `Deseja executar o Pull agora?`
                  );
                  
                  if (shouldPull) {
                      handlePull(); 
                  }
              } else {
                  alert(`Falha no Push: ${error.message}`);
              }
          }
      });
  };

  const handleRemoteConfig = () => {
      const url = githubUrlInput.trim();
      const name = remoteNameInput.trim();
      
      if (!url) {
          alert("URL é obrigatória");
          return;
      }

      gitQueue.enqueue(`Configurando Remote '${name}'`, async () => {
          await new Promise(r => setTimeout(r, 1500)); 
          
          if (url.includes('invalid')) {
              throw new Error(`Não foi possível resolver o host: ${url}`);
          }

          setRepo(prev => {
              const newRemotes = [...prev.remotes];
              const idx = newRemotes.findIndex(r => r.name === name);
              if (idx >= 0) {
                  newRemotes[idx] = { name, url };
              } else {
                  newRemotes.push({ name, url });
              }
              
              // Persist to SQLite
              NexusDB.remotes.add(name, url);

              return {
                ...prev,
                remotes: newRemotes,
                github: {
                    ...prev.github,
                    connected: true,
                    repoUrl: url
                }
              };
          });

          alert(`[Sucesso] Remote '${name}' configurado e salvo no banco de dados local.`);
          setRemoteNameInput('');
          setGithubUrlInput('');
      });
  };

  const removeRemote = (name: string) => {
    if(!confirm(`Tem certeza que deseja remover o remote '${name}'?`)) return;
    
    gitQueue.enqueue(`Removendo Remote '${name}'`, async () => {
        await new Promise(r => setTimeout(r, 500));
        setRepo(prev => ({
            ...prev,
            remotes: prev.remotes.filter(r => r.name !== name)
        }));
        // Remove from SQLite
        NexusDB.remotes.remove(name);
    });
  };

  const handleRevert = (filename: string) => {
      if (!window.confirm(`NexusVC: Reverter alterações em '${filename}'?\n\nIsso descartará todas as mudanças não commitadas.`)) return;
      
      const originalContent = repo.originalFiles[filename];
      if (originalContent !== undefined) {
          setRepo(prev => ({
              ...prev,
              files: { ...prev.files, [filename]: originalContent }
          }));
          // Update cache
          NexusDB.cache.upsert(filename, FileStatus.Unmodified);
      }
  };

  const handleRevertCommit = (commitId: string) => {
    const commit = repo.commits.find(c => c.id === commitId);
    if (!commit) return;

    if(!confirm(`Criar um novo commit revertendo as alterações de "${commit.message}"?`)) return;

    gitQueue.enqueue(`Revert commit ${commitId.substring(0,7)}`, async () => {
         await new Promise(r => setTimeout(r, 800));
         const newCommitId = Math.random().toString(36).substr(2, 7);
         const currentBranchObj = repo.branches.find(b => b.name === repo.currentBranch);
         
         const newCommit: ICommit = {
            id: newCommitId,
            message: `Revert "${commit.message}"`,
            author: repo.github.username || 'System',
            timestamp: Date.now(),
            changes: {}, 
            parent: currentBranchObj?.headCommitId || null,
            lane: commit.lane 
        };

        setRepo(prev => {
             const updatedBranches = prev.branches.map(b => 
                b.name === prev.currentBranch ? { ...b, headCommitId: newCommitId } : b
            );
            return {
                ...prev,
                commits: [newCommit, ...prev.commits],
                branches: updatedBranches
            }
        });
        alert("Commit de reversão criado com sucesso.");
    });
  }

  const handleHardReset = (targetCommitId: string) => {
      if (!window.confirm(
          `ATENÇÃO: Resetar para esta revisão?\n\n` +
          `Isso executará um 'git reset --hard'.\n` +
          `1. O HEAD será movido para ${targetCommitId.substring(0,7)}.\n` +
          `2. Todos os commits posteriores serão perdidos.\n` +
          `3. Todas as alterações locais não salvas serão descartadas.\n\n` +
          `Deseja continuar?`
      )) return;

      gitQueue.enqueue(`Reset Hard -> ${targetCommitId.substring(0,7)}`, async () => {
          await new Promise(r => setTimeout(r, 1000));
          
          setRepo(prev => {
              const commitIdx = prev.commits.findIndex(c => c.id === targetCommitId);
              if (commitIdx === -1) return prev;

              const newCommits = prev.commits.slice(commitIdx);
              
              const updatedBranches = prev.branches.map(b => 
                  b.name === prev.currentBranch ? { ...b, headCommitId: targetCommitId } : b
              );

              return {
                  ...prev,
                  commits: newCommits,
                  branches: updatedBranches,
                  files: { ...prev.originalFiles }, 
              };
          });
          alert(`Reset Hard concluído com sucesso.`);
          setViewMode('explorer');
      });
  }

  const handleCreateBranch = (commitId: string) => {
      const name = prompt("Nome da nova Branch:", "feature/nova-tarefa");
      if (!name) return;
      
      gitQueue.enqueue(`Criar Branch ${name}`, async () => {
          await new Promise(r => setTimeout(r, 500));
          setRepo(prev => ({
              ...prev,
              branches: [...prev.branches, { name, headCommitId: commitId }],
              currentBranch: name
          }));
          alert(`Branch '${name}' criada e checkout realizado.`);
      });
  };

  const handleCherryPick = (commitId: string) => {
      if(!confirm(`Confirmar Cherry-Pick do commit ${commitId.substring(0,7)}?`)) return;
      
      gitQueue.enqueue(`Cherry-Pick ${commitId.substring(0,7)}`, async () => {
           await new Promise(r => setTimeout(r, 800));
           // Mock logic
           alert("Cherry-pick aplicado com sucesso.\n(Alterações do commit foram aplicadas ao HEAD atual).");
      });
  };

  // --- Module 2: Smart Commit ---

  const openCommitDialog = () => {
    const filesForStage: Record<string, boolean> = {};
    let hasChanges = false;

    Object.keys(repo.files).forEach(file => {
      const status = getFileStatus(file);
      if (status !== FileStatus.Unmodified && status !== FileStatus.Ignored) {
        filesForStage[file] = true; 
        hasChanges = true;
      }
    });

    if (!hasChanges && !repo.mergeState.isMerging) {
      alert("Diretório de trabalho limpo (Clean).");
      return;
    }

    setFilesToCommit(filesForStage);
    setCommitMessage(repo.mergeState.isMerging ? `Merge branch '${repo.mergeState.sourceBranch}'` : '');
    setIsAmend(false);
    setViewMode('commit');
  };

  const handleCommit = (pushImmediately: boolean = false) => {
    const filesSelected = Object.keys(filesToCommit).filter(k => filesToCommit[k]);
    
    if (filesSelected.length === 0 && !isAmend) { alert("Nenhum arquivo selecionado."); return; }
    
    const lines = commitMessage.split('\n');
    if (lines[0].length > 50) {
        if(!confirm("A primeira linha do commit excede 50 caracteres. Isso viola a política corporativa. Deseja continuar mesmo assim?")) return;
    }

    gitQueue.enqueue('Commitando Alterações', async () => {
         await new Promise(r => setTimeout(r, 800));
        
        const currentBranchObj = repo.branches.find(b => b.name === repo.currentBranch);
        const currentHeadId = currentBranchObj?.headCommitId;
        const currentHeadCommit = repo.commits.find(c => c.id === currentHeadId);

        const newChanges = { ...repo.originalFiles };
        filesSelected.forEach(file => {
            newChanges[file] = repo.files[file];
        });

        const newCommitId = Math.random().toString(36).substr(2, 7);
        
        let parentId = currentHeadId || null;
        let secondaryParentId = repo.mergeState.isMerging ? repo.branches.find(b => b.name === repo.mergeState.sourceBranch)?.headCommitId : null;
        let lane = repo.currentBranch === 'master' ? 0 : 1;

        if (isAmend && currentHeadCommit) {
            parentId = currentHeadCommit.parent;
            secondaryParentId = currentHeadCommit.secondaryParent || null;
            lane = currentHeadCommit.lane || 0;
        }

        const newCommit: ICommit = {
            id: newCommitId,
            message: commitMessage,
            author: repo.github.username || 'Usuario Dev',
            timestamp: Date.now(),
            changes: newChanges,
            parent: parentId,
            secondaryParent: secondaryParentId,
            lane: lane
        };

        setRepo(prev => {
            const updatedBranches = prev.branches.map(b => 
                b.name === prev.currentBranch ? { ...b, headCommitId: newCommitId } : b
            );
            
            let newCommitsList = prev.commits;
            if (isAmend && currentHeadId) {
                newCommitsList = newCommitsList.filter(c => c.id !== currentHeadId);
            }

            // Update Cache after commit (files are now unmodified relative to HEAD)
            filesSelected.forEach(f => NexusDB.cache.upsert(f, FileStatus.Unmodified));

            return {
                ...prev,
                commits: [newCommit, ...newCommitsList],
                branches: updatedBranches,
                originalFiles: newChanges,
                mergeState: { isMerging: false, conflicts: [], theirs: {} } 
            };
        });

        if (pushImmediately) {
            handlePush();
        }
        setCommitMessage('');
        setViewMode('explorer');
    });
  };

  // --- Module 6: Workflow Wizard ---

  const handleTaskStart = () => {
      if(!taskName) return;
      const branchName = `${taskType}/${taskName.toLowerCase().replace(/\s+/g, '-')}`;
      
      gitQueue.enqueue(`Iniciando Tarefa: ${branchName}`, async () => {
          await new Promise(r => setTimeout(r, 600));
          setRepo(prev => {
            const currentHead = prev.branches.find(b => b.name === prev.currentBranch)?.headCommitId;
            return {
                ...prev,
                branches: [...prev.branches, { name: branchName, headCommitId: currentHead || null }],
                currentBranch: branchName
            }
          });
          alert(`[Wizard] Branch '${branchName}' criada.`);
          setViewMode('explorer');
      });
  };

  // --- Module 5: Merge & Conflict ---

  const handleMerge = (targetBranch: string) => {
     const hasConflict = targetBranch === 'feature/ui-refresh' && repo.currentBranch === 'master';

     if (hasConflict) {
         setRepo(prev => ({
             ...prev,
             mergeState: {
                 isMerging: true,
                 sourceBranch: targetBranch,
                 conflicts: ['service.js'],
                 theirs: {
                     'service.js': `function connect() {\n  // Nova lógica de conexão de ${targetBranch}\n  const v2 = true;\n  console.log("Connecting V2...");\n}`
                 }
             },
             files: {
                 ...prev.files,
                 'service.js': `<<<<<<< HEAD\n${prev.files['service.js']}\n=======\nfunction connect() {\n  // Nova lógica de conexão de ${targetBranch}\n  const v2 = true;\n  console.log("Connecting V2...");\n}\n>>>>>>> ${targetBranch}`
             }
         }));
         alert(`CONFLITO detectado pelo Auto-Merge. Entrando no Modo de Resolução 3-Way.`);
         setSelectedFile('service.js');
         setViewMode('explorer'); 
     } else {
         setCommitMessage(`Merge branch '${targetBranch}' into '${repo.currentBranch}'`);
         setRepo(prev => ({
             ...prev,
             mergeState: { isMerging: true, sourceBranch: targetBranch, conflicts: [], theirs: {} }
         }));
         openCommitDialog();
     }
  };

  const resolveConflict = (filename: string, finalContent: string) => {
      setRepo(prev => ({
          ...prev,
          files: { ...prev.files, [filename]: finalContent },
          mergeState: {
              ...prev.mergeState,
              conflicts: prev.mergeState.conflicts.filter(c => c !== filename)
          }
      }));
  };

  // --- AI Logic ---

  const handleAICommitMessage = async () => {
      const filesSelected = Object.keys(filesToCommit).filter(k => filesToCommit[k]);
      if (filesSelected.length === 0) return;
      const summary = filesSelected.map(f => `${getFileStatus(f)}: ${f}`).join('\n');
      const msg = await generateSmartCommitMessage(summary);
      setCommitMessage(msg);
  };

  const handleAskMentor = async () => {
      if(!mentorQuery) return;
      setIsMentorSearching(true);
      const res = await askGitMentorWithSearch(mentorQuery);
      setMentorResponse(res);
      setIsMentorSearching(false);
  };

  // Architect AI Logic
  const handleArchitectGenerate = async () => {
      if (!architectPrompt) return;
      setIsArchitectWorking(true);
      try {
          const files = await shapeProject(architectPrompt, Object.keys(repo.files));
          setProposedChanges(files);
      } catch (e) {
          alert("Erro ao gerar projeto com IA. Verifique a API Key.");
      } finally {
          setIsArchitectWorking(false);
      }
  };

  const applyArchitectChanges = () => {
      setRepo(prev => {
          const newFiles = { ...prev.files };
          proposedChanges.forEach(change => {
              newFiles[change.filename] = change.content;
          });
          return { ...prev, files: newFiles };
      });
      setProposedChanges([]);
      setArchitectPrompt('');
      alert("Alterações aplicadas ao diretório de trabalho. Verifique o 'File Watcher' para confirmar as mudanças.");
      setViewMode('explorer');
      // Select first new file
      if (proposedChanges.length > 0) setSelectedFile(proposedChanges[0].filename);
  };


  // --- Components ---

  const ContextMenu = () => {
    if (!contextMenu.visible) return null;
    const fileStatus = contextMenu.targetFile ? getFileStatus(contextMenu.targetFile) : null;
    const isModified = fileStatus === FileStatus.Modified;

    return (
      <div 
        ref={contextMenuRef}
        className="fixed bg-white border border-slate-400 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] py-1 w-64 z-50 text-sm text-slate-800 font-sans"
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        {/* Header for File Context */}
        {contextMenu.targetFile && (
             <div className="px-4 py-2 font-bold border-b border-slate-200 bg-slate-50 text-slate-600 truncate flex items-center gap-2">
               <FileCode size={14} /> {contextMenu.targetFile}
             </div>
        )}

        {/* Header for Commit Context */}
        {contextMenu.targetCommitId && (
             <div className="px-4 py-2 font-bold border-b border-slate-200 bg-slate-50 text-slate-600 truncate flex items-center gap-2">
               <GitCommit size={14} /> Commit {contextMenu.targetCommitId.substring(0,7)}
             </div>
        )}
        
        {/* NexusVC (formerly TortoiseGit) Actions for File */}
        {contextMenu.targetFile && isModified && (
            <>
                <button 
                    onClick={() => {
                        setDiffFile(contextMenu.targetFile!);
                        setViewMode('diff');
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 font-bold"
                >
                    <FileDiff size={14} /> NexusVC -> Diff
                </button>
                <button 
                    onClick={() => {
                        handleRevert(contextMenu.targetFile!);
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-red-600 hover:text-white"
                >
                    <Undo2 size={14} /> NexusVC -> Revert...
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
            </>
        )}

        {/* NexusVC Actions for Commit (Log View) */}
        {contextMenu.targetCommitId && (
            <>
                <button 
                    onClick={() => {
                        handleCreateBranch(contextMenu.targetCommitId!);
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-slate-700 hover:text-white"
                >
                    <PlusCircle size={14} /> NexusVC -> Criar Branch aqui
                </button>
                <button 
                    onClick={() => {
                        handleCherryPick(contextMenu.targetCommitId!);
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-slate-700 hover:text-white"
                >
                    <GitPullRequest size={14} /> NexusVC -> Cherry-pick
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button 
                    onClick={() => {
                        handleHardReset(contextMenu.targetCommitId!);
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-red-600 font-bold hover:text-white"
                >
                    <RotateCcw size={14} /> NexusVC -> Resetar para esta revisão
                </button>
                 <button 
                    onClick={() => {
                        handleRevertCommit(contextMenu.targetCommitId!);
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-slate-700 hover:text-white"
                >
                    <Undo2 size={14} /> NexusVC -> Reverter alterações
                </button>
                 <button 
                    onClick={() => {
                        navigator.clipboard.writeText(contextMenu.targetCommitId!);
                        setContextMenu({ ...contextMenu, visible: false });
                    }} 
                    className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-slate-600 hover:text-white"
                >
                    <Copy size={14} /> Copiar Hash
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
            </>
        )}

        {/* Standard Git Actions (only show if not commit context or maybe allow commit message edit later) */}
        {!contextMenu.targetCommitId && (
            <>
                <button onClick={() => openCommitDialog()} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2">
                    <GitCommit size={14} /> Git Commit -> {repo.currentBranch}
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button onClick={() => handlePush()} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2">
                    <UploadCloud size={14} /> NexusVC -> Push
                </button>
                <button onClick={() => handlePull()} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2">
                    <DownloadCloud size={14} /> NexusVC -> Pull
                </button>
            </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900" onContextMenu={(e) => handleRightClick(e)}>
      <ContextMenu />
      <Chatbot 
        files={repo.files} 
        onUpdateFile={(filename, content) => {
            setRepo(prev => ({
                ...prev,
                files: { ...prev.files, [filename]: content }
            }));
            // Also trigger a cache update to show modified icon immediately
            NexusDB.cache.upsert(filename, FileStatus.Modified);
        }} 
      />
      
      {/* Global Process Overlay */}
      {isBusy && (
          <div className="fixed inset-0 bg-black/20 z-[100] flex items-center justify-center cursor-wait">
              <div className="bg-white p-4 rounded shadow-xl border border-slate-300 flex items-center gap-3">
                  <RefreshCw className="animate-spin text-blue-600" />
                  <div>
                      <div className="font-bold text-slate-700">Gerenciador de Processos Git</div>
                      <div className="text-xs text-slate-500">{currentTaskName}...</div>
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar - System Integrated Look */}
      <div className="bg-slate-50 border-b border-slate-300 p-2 flex items-center gap-2 shadow-sm select-none">
        <div className="flex gap-1 mr-2">
            <img src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" className="w-6 h-6" alt="Git"/>
        </div>
        
        <div className="flex-1 flex items-center px-2 py-1 text-sm mr-4">
          <span className="text-slate-700 font-bold flex items-center gap-2 bg-white border border-slate-300 px-3 py-1 rounded shadow-sm">
              <HardDrive size={14} className="text-slate-500"/>
              NexusVC System Repository
              <span className="text-slate-300">|</span>
              <span className="text-blue-600">{repo.currentBranch}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 border-r border-l border-slate-200 px-4 mx-2">
            <button onClick={handlePull} className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 bg-gradient-to-b from-white to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded border border-slate-300 shadow-sm">
               <DownloadCloud size={14}/> Pull
            </button>
             <button onClick={handlePush} className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded border border-blue-700 shadow-sm">
               <UploadCloud size={14}/> Push
            </button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-slate-300 shadow-inner" title="Branch Atual (HEAD)">
            <GitBranch size={14} className="text-slate-500"/>
            <select 
                className="bg-transparent text-slate-700 text-xs font-bold outline-none min-w-[100px] cursor-pointer"
                value={repo.currentBranch}
                onChange={(e) => setRepo(p => ({...p, currentBranch: e.target.value}))}
            >
                {repo.branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
        </div>
        <button onClick={() => setViewMode('settings')} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 rounded" title="Configurações">
            <Settings size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#f0f0f0] border-r border-slate-300 p-2 hidden md:flex flex-col gap-1">
           
           <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mt-2">Desenvolvimento</div>
           <button 
                onClick={() => setViewMode('task_wizard')}
                className="flex items-center gap-2 text-sm text-left px-2 py-2 bg-white border border-slate-300 rounded shadow-sm hover:bg-blue-50 transition text-slate-700 font-medium"
           >
               <Play size={14} className="text-green-600"/> Iniciar Nova Tarefa
           </button>
           <div 
                className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${viewMode === 'explorer' ? 'bg-white border-slate-300 font-bold text-black shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-200'}`} 
                onClick={() => setViewMode('explorer')}
            >
                <FolderOpen size={16} className="text-yellow-600"/> Cópia de Trabalho
           </div>
           <div 
                className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${viewMode === 'preview' ? 'bg-white border-slate-300 font-bold text-black shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-200'}`} 
                onClick={() => setViewMode('preview')}
            >
                <MonitorPlay size={16} className="text-indigo-600"/> Live Preview
           </div>

           <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mt-4">Controle de Versão</div>
           <div 
                className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${viewMode === 'log' ? 'bg-white border-slate-300 font-bold text-black shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-200'}`} 
                onClick={() => setViewMode('log')}
            >
                <History size={16} className="text-purple-600"/> Gráfico de Commits
           </div>
            <div 
                className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${viewMode === 'merge' ? 'bg-white border-slate-300 font-bold text-black shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-200'}`} 
                onClick={() => setViewMode('merge')}
            >
                <GitMerge size={16} className="text-orange-600"/> Assistente de Merge
           </div>

           <div className="mt-auto pt-2 border-t border-slate-300">
                <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Gemini Enterprise</div>
                <div 
                    className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${viewMode === 'architect' ? 'bg-gradient-to-r from-purple-100 to-white border-purple-200 font-bold text-purple-900 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-200'}`} 
                    onClick={() => setViewMode('architect')}
                >
                    <Cpu size={16} className="text-purple-600"/> Arquiteto de Projetos
                </div>
                <div 
                    className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${viewMode === 'mentor' ? 'bg-white border-slate-300 font-bold text-black shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-200'}`} 
                    onClick={() => setViewMode('mentor')}
                >
                    <BookOpen size={16} className="text-blue-600"/> Mentor Git
                </div>
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white relative flex flex-col">
           
           {/* EXPLORER MODE */}
           {viewMode === 'explorer' && (
             <div className="flex flex-col h-full p-2 gap-2">
                {/* Conflict Alert Banner */}
                {repo.mergeState.conflicts.length > 0 && (
                    <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded flex items-center gap-3 shadow-sm animate-pulse">
                        <ShieldAlert size={24} />
                        <div className="flex-1">
                            <p className="font-bold text-sm">CONFLITO DE MERGE DETECTADO</p>
                            <p className="text-xs">O Git entrou em estado "Unmerged" (UU). Você deve resolver manualmente abaixo.</p>
                        </div>
                    </div>
                )}

                {/* Editor / 3-Way Merge Area */}
                <div className="flex-1 border border-slate-300 rounded overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 flex justify-between items-center h-8">
                         <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                            {getFileStatus(selectedFile) === FileStatus.Conflicted 
                                ? <><GitMerge size={14}/> Resolução de Conflito 3-Way</> 
                                : <><FileCode size={14}/> Editor de Arquivo</>
                            }
                        </span>
                    </div>
                    
                    <div className="flex-1 relative overflow-hidden">
                        {getFileStatus(selectedFile) === FileStatus.Conflicted ? (
                            // MODULE 5: 3-WAY MERGE UI
                            <ThreeWayMergeViewer 
                                filename={selectedFile}
                                ours={repo.originalFiles[selectedFile] || ''}
                                theirs={repo.mergeState.theirs[selectedFile] || ''}
                                result={repo.files[selectedFile]}
                                onResultChange={(val) => setRepo(p => ({...p, files: {...p.files, [selectedFile]: val}}))}
                            />
                        ) : (
                            // Standard Editor
                            <textarea
                                value={repo.files[selectedFile]}
                                onChange={(e) => setRepo(p => ({...p, files: {...p.files, [selectedFile]: e.target.value}}))}
                                className="w-full h-full p-4 font-mono text-sm resize-none outline-none text-slate-800"
                            />
                        )}
                    </div>
                    {getFileStatus(selectedFile) === FileStatus.Conflicted && (
                         <div className="bg-red-50 p-2 border-t border-red-200 flex justify-end">
                             <button 
                                onClick={() => resolveConflict(selectedFile, repo.files[selectedFile])}
                                className="bg-red-600 text-white px-4 py-1 text-xs font-bold rounded shadow hover:bg-red-700"
                             >
                                Marcar como Resolvido (git add)
                             </button>
                         </div>
                    )}
                </div>

                {/* File List */}
                <div className="h-48 border border-slate-300 rounded overflow-hidden flex flex-col bg-white">
                     <div className="bg-slate-100 border-b border-slate-300 px-4 py-1 text-[11px] font-bold text-slate-600 uppercase flex">
                        <span className="w-10">Status</span>
                        <span className="flex-1">Arquivo</span>
                     </div>
                     <div className="overflow-auto flex-1">
                        {Object.keys(repo.files).map(filename => {
                            const status = getFileStatus(filename);
                            let code = '  ';
                            let icon = <div className="w-4"/>;
                            let color = 'text-slate-800';

                            // Module 1: Advanced Status Icons
                            if (status === FileStatus.Modified) { code = ' M'; icon = <CheckCircle2 size={14} className="text-red-500"/>; color = 'text-red-600'; }
                            if (status === FileStatus.Untracked) { code = '??'; icon = <FilePlus size={14} className="text-blue-500"/>; color = 'text-blue-600'; }
                            if (status === FileStatus.Conflicted) { code = 'UU'; icon = <AlertTriangle size={14} className="text-orange-600"/>; color = 'text-orange-700 bg-orange-50'; }

                            return (
                                <div 
                                    key={filename} 
                                    className={`flex items-center px-2 py-1 text-xs border-b border-slate-50 hover:bg-blue-50 cursor-pointer ${selectedFile === filename ? 'bg-blue-100' : ''} ${color}`}
                                    onClick={() => setSelectedFile(filename)}
                                    onContextMenu={(e) => handleRightClick(e, filename)}
                                >
                                    <span className="w-10 font-mono font-bold opacity-50">{code}</span>
                                    <span className="mr-2">{icon}</span>
                                    <span className="font-medium">{filename}</span>
                                </div>
                            )
                        })}
                     </div>
                </div>
             </div>
           )}

           {/* NEW MODE: DIFF VIEWER */}
           {viewMode === 'diff' && diffFile && (
               <div className="h-full p-0">
                   <DiffViewer 
                        filename={diffFile} 
                        original={repo.originalFiles[diffFile] || ''} 
                        modified={repo.files[diffFile] || ''} 
                        onClose={() => setViewMode('explorer')}
                   />
               </div>
           )}

           {/* NEW MODE: LIVE PREVIEW */}
           {viewMode === 'preview' && (
               <div className="h-full p-4 bg-slate-200">
                   <LivePreview files={repo.files} />
               </div>
           )}

           {/* NEW MODE: ARCHITECT */}
           {viewMode === 'architect' && (
               <div className="flex flex-col h-full">
                   <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center shadow-md">
                       <div>
                           <h2 className="text-xl font-bold flex items-center gap-2"><BrainCircuit/> Arquiteto de Software (Thinking Mode)</h2>
                           <p className="text-xs text-slate-400 mt-1">Gemini 3.0 Pro com Thinking Budget (32k). Ideal para arquitetura complexa.</p>
                       </div>
                   </div>

                   <div className="flex-1 flex overflow-hidden">
                       {/* Input Area */}
                       <div className="w-1/3 p-4 border-r border-slate-200 bg-slate-50 flex flex-col gap-4">
                           <div className="flex-1">
                               <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Prompt de Arquitetura</label>
                               <textarea
                                   value={architectPrompt}
                                   onChange={e => setArchitectPrompt(e.target.value)}
                                   className="w-full h-64 border border-slate-300 rounded p-3 text-sm focus:border-purple-500 outline-none shadow-sm"
                                   placeholder="Ex: Crie uma página de login moderna com CSS embutido. O formulário deve ter campos para email e senha, e um botão verde."
                               />
                           </div>
                           <button 
                                onClick={handleArchitectGenerate}
                                disabled={isArchitectWorking || !architectPrompt}
                                className="w-full py-3 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isArchitectWorking ? <RefreshCw className="animate-spin"/> : <Sparkles/>}
                                {isArchitectWorking ? 'Pensando e Gerando...' : 'Gerar Estrutura'}
                            </button>
                       </div>

                       {/* Results Area */}
                       <div className="flex-1 bg-slate-100 p-4 overflow-auto">
                           {proposedChanges.length === 0 ? (
                               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                   <Bot size={48} className="mb-4 opacity-20"/>
                                   <p className="text-sm">Os arquivos gerados aparecerão aqui para revisão.</p>
                                   {isArchitectWorking && <p className="text-xs text-purple-600 mt-2 animate-pulse">Thinking in progress...</p>}
                               </div>
                           ) : (
                               <div className="space-y-4">
                                   <div className="flex justify-between items-center mb-2">
                                       <h3 className="font-bold text-slate-700">Arquivos Propostos ({proposedChanges.length})</h3>
                                       <button onClick={applyArchitectChanges} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-green-700 shadow flex items-center gap-2">
                                           <CheckCircle2 size={14}/> Aplicar ao Projeto
                                       </button>
                                   </div>
                                   
                                   {proposedChanges.map((file, idx) => (
                                       <div key={idx} className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
                                           <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                                               <span className="font-bold text-sm flex items-center gap-2"><FileCode size={14} className="text-blue-500"/> {file.filename}</span>
                                               <span className="text-xs text-slate-500 italic">{file.reasoning}</span>
                                           </div>
                                           <pre className="p-3 text-xs font-mono text-slate-700 overflow-x-auto bg-slate-50 max-h-40">
                                               {file.content}
                                           </pre>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </div>
                   </div>
               </div>
           )}

           {/* MODULE 6: TASK WIZARD */}
           {viewMode === 'task_wizard' && (
               <div className="flex items-center justify-center h-full bg-slate-50">
                   <div className="bg-white border border-slate-300 shadow-xl rounded w-[500px]">
                       <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-t font-bold flex items-center gap-2">
                           <Sparkles size={18}/> Wizard de Nova Tarefa
                       </div>
                       <div className="p-6 space-y-4">
                           <p className="text-sm text-slate-600">Este assistente garante que as políticas de branches sejam seguidas.</p>
                           
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo da Tarefa</label>
                               <div className="grid grid-cols-3 gap-2">
                                   {['feature', 'bugfix', 'hotfix'].map(t => (
                                       <button 
                                            key={t}
                                            onClick={() => setTaskType(t as TaskType)}
                                            className={`p-2 border rounded text-sm font-bold capitalize ${taskType === t ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {t}
                                        </button>
                                   ))}
                               </div>
                           </div>
                           
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Tarefa (Descrição Curta)</label>
                               <div className="flex items-center border border-slate-300 rounded overflow-hidden focus-within:border-blue-500">
                                   <div className="bg-slate-100 px-3 py-2 text-sm text-slate-500 font-mono border-r border-slate-300">
                                       {taskType}/
                                   </div>
                                   <input 
                                        type="text" 
                                        className="flex-1 p-2 text-sm outline-none" 
                                        placeholder="tela-login-v2"
                                        value={taskName}
                                        onChange={e => setTaskName(e.target.value)}
                                   />
                               </div>
                           </div>

                           <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800">
                               <span className="font-bold">Preview:</span> git checkout -b {taskType}/{taskName.toLowerCase().replace(/\s+/g, '-') || '...'}
                           </div>
                       </div>
                       <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2 rounded-b">
                           <button onClick={() => setViewMode('explorer')} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                           <button onClick={handleTaskStart} disabled={!taskName} className="px-4 py-2 text-sm bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">Iniciar Tarefa</button>
                       </div>
                   </div>
               </div>
           )}

           {/* GRAPH LOG MODE */}
           {viewMode === 'log' && (
               <div className="flex flex-col h-full">
                   <div className="p-2 border-b border-slate-300 bg-slate-50 flex justify-between items-center">
                       <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2"><GitBranch size={16}/> Gráfico de Revisão</h2>
                       <div className="text-xs text-slate-500 flex gap-2">
                           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> master</span>
                           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> feature</span>
                       </div>
                   </div>
                   <div className="flex-1 overflow-auto p-4 bg-slate-100">
                        <div className="border border-slate-300 bg-white shadow-sm rounded-sm overflow-hidden">
                            <div className="bg-slate-200 px-2 py-1 flex text-[10px] font-bold text-slate-600 border-b border-slate-300 uppercase">
                                <div className="w-40">Grafo</div>
                                <div className="flex-1">Mensagem</div>
                                <div className="w-32">Autor</div>
                                <div className="w-24 text-right">Data</div>
                            </div>
                            <GitGraph 
                                commits={repo.commits} 
                                onRowContextMenu={(e, commitId) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({
                                        visible: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        targetCommitId: commitId
                                    });
                                }}
                                onReset={(id) => handleHardReset(id)}
                            />
                        </div>
                   </div>
               </div>
           )}

           {/* MODULE 4.1: REMOTE SETTINGS */}
           {viewMode === 'settings' && (
                <div className="p-8 max-w-xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-xl flex items-center gap-2 text-slate-800"><Settings size={24}/> Configurações do NexusVC</h2>
                        <button onClick={() => setViewMode('explorer')} className="text-slate-400 hover:text-slate-600"><X/></button>
                    </div>

                    {/* Embedded DB Stats */}
                     <div className="bg-amber-50 p-4 rounded border border-amber-200 mb-6">
                        <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                            <Database size={16} /> Banco de Dados Local (SQLite Embedded)
                        </h3>
                        <p className="text-xs text-amber-700 mb-3">
                            Usado para cache de ícones de status e histórico de repositórios (similar ao TortoiseGit Cache).
                        </p>
                        <div className="flex justify-between items-center text-xs text-slate-600 bg-white p-2 rounded border border-amber-100">
                            <span>Entradas em Cache: <strong>{NexusDB.cache.count()}</strong></span>
                            <button 
                                onClick={() => { 
                                    NexusDB.cache.clear(); 
                                    alert('Cache de ícones limpo.'); 
                                }} 
                                className="text-red-600 hover:underline"
                            >
                                Limpar Cache
                            </button>
                        </div>
                    </div>

                    {/* List of Remotes */}
                    <div className="bg-white p-6 rounded shadow-lg border border-slate-200 mb-6">
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 flex justify-between items-center">
                            <span>Remotes Configurados</span>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{repo.remotes.length}</span>
                        </h3>
                        
                        {repo.remotes.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm italic bg-slate-50 rounded border border-dashed border-slate-200">
                                Nenhum repositório remoto configurado.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {repo.remotes.map(r => (
                                    <div key={r.name} className="flex items-center justify-between bg-slate-50 p-3 border border-slate-200 rounded group hover:border-blue-300 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-white p-2 rounded border border-slate-200 text-slate-500 shadow-sm">
                                                <Server size={16}/>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="font-bold text-sm text-slate-700 truncate" title={r.name}>{r.name}</div>
                                                <div className="text-xs text-slate-500 font-mono truncate max-w-[250px] md:max-w-[350px]" title={r.url}>{r.url}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeRemote(r.name)} 
                                            className="text-slate-400 hover:text-red-500 hover:bg-white p-2 rounded border border-transparent hover:border-red-100 transition-all shadow-sm opacity-60 group-hover:opacity-100"
                                            title="Remover Remote"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded shadow-lg border border-slate-200 space-y-6">
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Adicionar / Atualizar Remote</h3>
                        {/* Remote Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Server size={14}/> Nome do Remote
                            </label>
                            <input 
                                className="w-full border border-slate-300 p-2 rounded bg-slate-50 text-sm font-mono" 
                                value={remoteNameInput} 
                                onChange={e => setRemoteNameInput(e.target.value)}
                                placeholder="origin"
                            />
                        </div>

                        {/* Remote URL */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <LinkIcon size={14}/> URL do Repositório
                            </label>
                            <input 
                                className="w-full border border-slate-300 p-2 rounded text-sm font-mono focus:border-blue-500 outline-none transition-colors" 
                                placeholder="git@github.com:empresa/repo.git  OU  https://github.com/..." 
                                value={githubUrlInput} 
                                onChange={e => setGithubUrlInput(e.target.value)}
                            />
                            
                            {/* Protocol Detector Badges */}
                            <div className="flex gap-2 mt-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border ${githubUrlInput.startsWith('https://') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                    <Globe size={10}/> HTTPS
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border ${githubUrlInput.startsWith('git@') ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                    <Lock size={10}/> SSH
                                </span>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-3 rounded text-xs text-blue-800">
                            <p className="font-bold mb-1">Preview do Comando:</p>
                            <code className="font-mono">git remote add {remoteNameInput} {githubUrlInput || '<url>'}</code>
                        </div>

                        <button 
                            onClick={handleRemoteConfig} 
                            className="w-full bg-blue-600 text-white px-4 py-3 rounded font-bold text-sm hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2"
                        >
                            <UploadCloud size={16}/> Configurar Remote
                        </button>
                    </div>
                </div>
           )}

           {viewMode === 'mentor' && (
               <div className="flex flex-col h-full p-4">
                   <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Search/> Mentor Git (com Google Grounding)</h2>
                   <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-4 mb-4 overflow-auto text-sm whitespace-pre-wrap">
                       {mentorResponse ? (
                           <div>
                               <p>{mentorResponse.text}</p>
                               {mentorResponse.sources.length > 0 && (
                                   <div className="mt-4 border-t pt-2">
                                       <p className="font-bold text-xs text-slate-500 uppercase mb-1">Fontes do Google Search:</p>
                                       <ul className="list-disc pl-4 text-xs text-blue-600">
                                           {mentorResponse.sources.map((s, i) => <li key={i}><a href={s} target="_blank" rel="noopener noreferrer" className="hover:underline">{s}</a></li>)}
                                       </ul>
                                   </div>
                               )}
                           </div>
                       ) : (
                           "Como posso ajudar? Pesquisarei na documentação atual do Git para você."
                       )}
                   </div>
                   <div className="flex gap-2">
                       <input 
                        className="flex-1 border p-2 rounded shadow-sm" 
                        value={mentorQuery} 
                        onChange={e => setMentorQuery(e.target.value)} 
                        placeholder="Ex: Como resolver erro 'fatal: refusing to merge unrelated histories'?"
                        onKeyDown={e => e.key === 'Enter' && handleAskMentor()}
                       />
                       <button onClick={handleAskMentor} disabled={isMentorSearching} className="bg-blue-600 text-white px-4 rounded font-bold hover:bg-blue-700 flex items-center gap-2">
                           {isMentorSearching ? <RefreshCw className="animate-spin" size={16}/> : <Search size={16}/>}
                           Pesquisar
                       </button>
                   </div>
               </div>
           )}
           
           {viewMode === 'commit' && (
               <div className="absolute inset-0 bg-white z-20 flex flex-col p-4">
                   <div className="flex justify-between items-center mb-4 border-b pb-2">
                       <h2 className="font-bold text-lg flex items-center gap-2"><GitCommit/> Commitar Alterações</h2>
                       <button onClick={() => setViewMode('explorer')}><X className="text-slate-400 hover:text-red-500"/></button>
                   </div>
                   
                   <div className="flex-1 flex gap-4">
                       <div className="flex-1 flex flex-col">
                           <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-50 border border-yellow-100 rounded">
                               <input 
                                   type="checkbox" 
                                   id="amend-option"
                                   checked={isAmend}
                                   onChange={(e) => {
                                       setIsAmend(e.target.checked);
                                       if (e.target.checked) {
                                           const headId = repo.branches.find(b => b.name === repo.currentBranch)?.headCommitId;
                                           const head = repo.commits.find(c => c.id === headId);
                                           if (head) setCommitMessage(head.message);
                                       }
                                   }}
                                   className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                               />
                               <label htmlFor="amend-option" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                   Emendar último commit (--amend)
                               </label>
                           </div>

                           <label className="font-bold text-xs uppercase text-slate-500 mb-1">Mensagem</label>
                           <textarea 
                                className={`flex-1 border rounded p-2 font-mono text-sm outline-none resize-none ${commitMessage.split('\n')[0].length > 50 ? 'border-orange-300 bg-orange-50' : 'border-slate-300'}`}
                                value={commitMessage}
                                onChange={e => setCommitMessage(e.target.value)}
                                placeholder="feat: descrição curta (max 50 chars)&#10;&#10;Descrição mais detalhada aqui..."
                            />
                            <div className={`text-right text-xs mt-1 ${commitMessage.split('\n')[0].length > 50 ? 'text-orange-600 font-bold' : 'text-slate-400'}`}>
                                Linha de Assunto: {commitMessage.split('\n')[0].length}/50 chars
                            </div>
                       </div>
                       <div className="w-1/3 border border-slate-300 rounded overflow-hidden flex flex-col">
                           <div className="bg-slate-100 p-2 font-bold text-xs border-b">Arquivos Preparados (Staged)</div>
                           <div className="flex-1 overflow-auto p-2">
                               {Object.keys(filesToCommit).map(f => (
                                   <div key={f} className="flex items-center gap-2 text-sm mb-1">
                                       <CheckSquare size={14} className="text-blue-600"/> {f}
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                       <button onClick={handleAICommitMessage} className="text-purple-600 hover:bg-purple-50 px-3 py-2 rounded text-sm font-bold flex items-center gap-1"><Sparkles size={14}/> Gerar com IA (Flash-Lite)</button>
                       <button onClick={() => handleCommit(false)} className="border border-slate-300 px-4 py-2 rounded text-sm font-bold hover:bg-slate-50">Commitar</button>
                       <button onClick={() => handleCommit(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Commitar & Push</button>
                   </div>
               </div>
           )}

        </div>
      </div>
      
      {/* Footer Status Bar */}
      <div className="h-6 bg-[#007acc] text-white text-[11px] flex items-center px-2 justify-between select-none cursor-default">
         <div className="flex gap-4">
             <span className="flex items-center gap-1"><GitBranch size={10}/> {repo.currentBranch}</span>
             <span>{useRebase ? 'Pull: Rebase' : 'Pull: Merge'}</span>
             <span>Fila: {isBusy ? 'Processando...' : 'Ocioso'}</span>
         </div>
         <div className="flex gap-2 items-center">
            <span className="flex items-center gap-1" title="File Watcher Ativo"><Eye size={10} className="animate-pulse"/> Watcher</span>
            <span className="flex items-center gap-1" title="DB Local"><Database size={10}/> SQL: {NexusDB.cache.count()} recs</span>
            <span>UTF-8</span>
            <span>LF</span>
         </div>
      </div>
    </div>
  );
}
