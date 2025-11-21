
import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
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

// REQUISITO: AI powered chatbot (Gemini 3 Pro)
export const streamChatResponse = async function* (history: {role: string, parts: {text: string}[]}[], newMessage: string) {
    const ai = getAiClient();
    if (!ai) {
        yield "Chat indisponível.";
        return;
    }

    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        history: history
    });

    const result = await chat.sendMessageStream({ message: newMessage });
    
    for await (const chunk of result) {
        yield chunk.text;
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
