export type NimChatRole = "system" | "user" | "assistant";

export type NimChatMessage = {
  role: NimChatRole;
  content: string;
};

type NimChatResponse = {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: NimChatRole;
      content: string;
    };
    finish_reason?: string;
  }>;
};

const DEFAULT_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

const getNimConfig = () => {
  const apiKey = process.env.NIM_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error(
      "NIM_API_KEY is not configured. Please set it in your .env file."
    );
  }

  const baseUrl = process.env.NIM_BASE_URL || DEFAULT_NIM_BASE_URL;
  const model = process.env.NIM_MODEL;
  
  console.log("DEBUG getNimConfig:", { 
    apiKey: apiKey?.substring(0, 10) + "...",
    baseUrl, 
    model,
    allEnv: Object.keys(process.env).filter(k => k.startsWith('NIM'))
  });
  
  if (!model) {
    throw new Error("Missing NIM_MODEL environment variable.");
  }

  return { apiKey, baseUrl, model };
};

const extractJson = (content: string) => {
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error("No JSON object found in model response. Content:", content);
    throw new Error("No JSON object found in model response.");
  }
  let jsonText = content.slice(firstBrace, lastBrace + 1);
  
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Invalid JSON in model response.");
    console.error("Raw content:", content);
    console.error("Extracted JSON text:", jsonText);
    console.error("Parse error:", error);
    
    // Attempt to repair incomplete JSON by adding missing closing brackets
    console.log("Attempting to repair incomplete JSON...");
    const openBraces = (jsonText.match(/{/g) || []).length;
    const closeBraces = (jsonText.match(/}/g) || []).length;
    const openBrackets = (jsonText.match(/\[/g) || []).length;
    const closeBrackets = (jsonText.match(/\]/g) || []).length;
    
    let repairedJson = jsonText;
    
    // Add missing closing brackets/braces
    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
      repairedJson += "]";
    }
    for (let i = 0; i < (openBraces - closeBraces); i++) {
      repairedJson += "}";
    }
    
    try {
      console.log("Repaired JSON text:", repairedJson);
      return JSON.parse(repairedJson);
    } catch (repairError) {
      console.error("Failed to repair JSON:", repairError);
      throw new Error("Invalid JSON in model response.");
    }
  }
};

const sanitizeFeedback = (data: any): Feedback => {
  const defaultCategory = { score: 0, tips: [] };
  
  return {
    overallScore: typeof data?.overallScore === 'number' ? data.overallScore : 0,
    ATS: {
      score: typeof data?.ATS?.score === 'number' ? data.ATS.score : 0,
      tips: Array.isArray(data?.ATS?.tips) ? data.ATS.tips : [],
    },
    toneAndStyle: {
      score: typeof data?.toneAndStyle?.score === 'number' ? data.toneAndStyle.score : 0,
      tips: Array.isArray(data?.toneAndStyle?.tips) ? data.toneAndStyle.tips : [],
    },
    content: {
      score: typeof data?.content?.score === 'number' ? data.content.score : 0,
      tips: Array.isArray(data?.content?.tips) ? data.content.tips : [],
    },
    structure: {
      score: typeof data?.structure?.score === 'number' ? data.structure.score : 0,
      tips: Array.isArray(data?.structure?.tips) ? data.structure.tips : [],
    },
    skills: {
      score: typeof data?.skills?.score === 'number' ? data.skills.score : 0,
      tips: Array.isArray(data?.skills?.tips) ? data.skills.tips : [],
    },
  };
};

export const callNimChat = async ({
  messages,
  temperature = 0.2,
  maxTokens = 1500,
}: {
  messages: NimChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) => {
  const { apiKey, baseUrl, model } = getNimConfig();

  const url = `${baseUrl}/chat/completions`;
  console.log("NIM API request:", { url, model, messageCount: messages.length });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your NIM_API_KEY.");
      }
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      
      throw new Error(
        `NIM API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data = (await response.json()) as NimChatResponse;
    const content = data.choices?.[0]?.message?.content;
    
    console.log("Raw AI response content:", content);
    
    if (!content) {
      throw new Error("Empty response from NIM API.");
    }

    const rawJson = extractJson(content);
    console.log("Parsed JSON successfully");
    return sanitizeFeedback(rawJson);
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout. Please try again.");
      }
      throw error;
    }
    
    throw new Error("Failed to communicate with NIM API.");
  }
};
