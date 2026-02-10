import { env } from "../../config/env.js";

const WATSONX_URL = "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";

let cachedToken: string | null = null;
let tokenExpiryMs = 0;

const getConfiguredCredentials = () => {
  if (!env.MY_IBM_KEY) {
    throw new Error("MY_IBM_KEY is not configured");
  }
  if (!env.WATSONX_PROJECT_ID) {
    throw new Error("WATSONX_PROJECT_ID is not configured");
  }
  return {
    apiKey: env.MY_IBM_KEY,
    projectId: env.WATSONX_PROJECT_ID
  };
};

const getIAMToken = async (apiKey: string): Promise<string> => {
  const now = Date.now();
  if (cachedToken && tokenExpiryMs > now) {
    return cachedToken;
  }

  const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get IAM token (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token || !data.expires_in) {
    throw new Error("Invalid IAM token response");
  }

  cachedToken = data.access_token;
  tokenExpiryMs = now + (data.expires_in - 300) * 1000;
  return cachedToken;
};

type WatsonMessage = {
  role: "user" | "assistant" | "system";
  content: unknown;
};

type WatsonRequest = {
  messages: WatsonMessage[];
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
};

export const callWatsonx = async (input: WatsonRequest) => {
  const credentials = getConfiguredCredentials();
  const iamToken = await getIAMToken(credentials.apiKey);

  const response = await fetch(WATSONX_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${iamToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      messages: input.messages,
      project_id: credentials.projectId,
      model_id: input.modelId,
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 6000,
      top_p: input.topP ?? 1,
      frequency_penalty: input.frequencyPenalty ?? 0,
      presence_penalty: input.presencePenalty ?? 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      tokenExpiryMs = 0;
    }
    throw new Error(`WatsonX API error (${response.status}): ${errorText}`);
  }

  return response.json();
};
