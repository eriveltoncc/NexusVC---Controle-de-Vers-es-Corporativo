

import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Definição da ferramenta de edição de arquivos
const updateFileTool: Tool = {
  functionDeclarations: [{
    name: "update_file",
    description: "Atualiza ou cria um arquivo no repositório com novo conteúdo. Use isso quando o usuário pedir alterações no código.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filename: {
          type: Type.STRING,
          description: "O nome do arquivo a ser editado (ex: index.html, style.css)."
        },
        content: {
          type: Type.STRING,
          description: "O conteúdo COMPLETO do arquivo. Não use diffs ou snippets, forneça o arquivo inteiro."
        },
        reasoning: {
          type: Type.STRING,
          description: "Uma explicação curta do que foi alterado."
        }
      },
      required: ["filename", "content", "reasoning"]
    }
  }]
};

// REQUISITO: Fast AI responses (Flash-Lite)
export const generateSmartCommitMessage = async (diffSummary: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "chore: update files (AI unavailable)";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest', // Modelo rápido para baixa latência
      contents: `
        Atue como um Engenheiro de Software Sênior.
        Gere uma mensagem de commit padrão Conventional Commits (feat:, fix:, chore:) para as seguintes mudanças.
        Seja conciso.
        
        Mudanças:
        ${diffSummary}

        Responda APENAS com a mensagem de commit.
      `,
    });
    return response.text?.trim() || "chore: update files";
  } catch (error) {
    console.error("Error generating commit message:", error);
    return "chore: update files";
  }
};

// REQUISITO: Use Google Search data (Flash + Grounding)
export const askGitMentorWithSearch = async (question: string): Promise<{text: string, sources: string[]}> => {
  const ai = getAiClient();
  if (!ai) return { text: "Mentoria indisponível.", sources: [] };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Modelo eficiente para tools
      contents: `Responda à dúvida do usuário sobre Git/Desenvolvimento: "${question}"`,
      config: {
        tools: [{ googleSearch: {} }], // Grounding ativo
      }
    });

    // Extração de fontes do Grounding
    const sources: string[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) sources.push(chunk.web.uri);
        });
    }

    return { 
        text: response.text || "Não encontrei informações.", 
        sources: [...new Set(sources)] // Unique URLs
    };
  } catch (error) {
    console.error("Error answering git question:", error);
    return { text: "Erro ao consultar a web.", sources: [] };
  }
};

// Interface para retorno do Chat Agent
export interface IChatResponseChunk {
    text?: string;
    toolCall?: {
        id: string;
        name: string;
        args: any;
    };
}

// REQUISITO: AI powered chatbot (Gemini 3 Pro ou 2.5 Flash) com capacidade de AGENTE
export const streamChatResponse = async function* (
    history: {role: string, parts: {text: string}[]}[], 
    newMessage: string,
    currentFiles: Record<string, string>,
    modelName: string = 'gemini-3-pro-preview'
): AsyncGenerator<IChatResponseChunk> {
    // Sempre cria um novo cliente para garantir a chave mais recente
    const ai = getAiClient();
    if (!ai) {
        yield { text: "Erro: API Key não configurada. Por favor conecte sua conta." };
        return;
    }

    // Prepara o contexto dos arquivos para o System Instruction
    const fileContext = Object.entries(currentFiles)
        .map(([name, content]) => `--- FILE: ${name} ---\n${content}\n--- END FILE ---`)
        .join('\n');

    const systemInstruction = `
        Você é o NexusVC Code Agent.
        Seu objetivo é atuar como um Programador Sênior que tem acesso direto aos arquivos do usuário.
        
        FOCO:
        - NÃO explique comandos Git ou tutoriais de terminal. Se o usuário perguntar sobre Git, diga que seu foco é edição de código e sugira o uso do "Mentor Git" no menu lateral.
        - SEU FOCO é alterar código: HTML, CSS, JS, TS, React, etc.
        - Você DEVE usar a ferramenta 'update_file' para aplicar alterações solicitadas.

        CONTEXTO ATUAL DOS ARQUIVOS:
        ${fileContext}

        Se o usuário pedir para alterar, criar ou corrigir código:
        1. Analise os arquivos fornecidos no contexto.
        2. Planeje a alteração necessária.
        3. CHAME A FERRAMENTA 'update_file' com o novo conteúdo completo do arquivo.
        4. Explique brevemente o que foi alterado no código.
    `;

    const chat = ai.chats.create({
        model: modelName,
        history: history,
        config: {
            systemInstruction: systemInstruction,
            tools: [updateFileTool]
        }
    });

    const result = await chat.sendMessageStream({ message: newMessage });
    
    for await (const chunk of result) {
        // Verifica se há chamadas de função (Tools)
        const functionCalls = chunk.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                yield { 
                    toolCall: {
                        id: call.id || 'unknown', // ID nem sempre vem no chunk simplificado, mas tratamos no loop
                        name: call.name,
                        args: call.args
                    }
                };
            }
        }

        // Verifica se há texto
        if (chunk.text) {
            yield { text: chunk.text };
        }
    }
}

// Arquiteto de Projetos
export interface IAiGeneratedFile {
  filename: string;
  content: string;
  reasoning: string;
}

// REQUISITO: Think more when needed (Thinking Mode)
export const shapeProject = async (prompt: string, currentFiles: string[]): Promise<IAiGeneratedFile[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("AI Client not configured");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Modelo mais inteligente
      contents: `
        Você é um Arquiteto de Software Sênior.
        O usuário quer moldar o projeto atual.
        
        Arquivos existentes: ${currentFiles.join(', ')}
        
        Pedido do Usuário: "${prompt}"
        
        Gere um JSON válido contendo uma lista de arquivos a serem criados ou modificados.
        Use CSS moderno e boas práticas.
        
        Formato de resposta JSON esperado:
        [
          { "filename": "nome.ext", "content": "codigo...", "reasoning": "explicação" }
        ]
      `,
      config: {
        // Thinking Mode configuration
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    filename: { type: Type.STRING },
                    content: { type: Type.STRING },
                    reasoning: { type: Type.STRING }
                },
                required: ["filename", "content", "reasoning"]
            }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error shaping project:", error);
    throw error;
  }
};

// REQUISITO: Analyze content (Diff explanation)
export const explainChanges = async (filename: string, original: string, modified: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI indisponível para análise.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `
        Atue como um revisor de código (Code Reviewer).
        Explique de forma concisa as alterações feitas no arquivo "${filename}".
        Destaque riscos ou melhorias se houver.
        
        Conteúdo Original:
        ${original}
        
        Conteúdo Modificado:
        ${modified}
      `
    });
    return response.text || "Sem análise gerada.";
  } catch (error) {
    console.error(error);
    return "Erro na análise de diff.";
  }
};