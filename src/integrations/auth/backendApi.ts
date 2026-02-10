import { API_BASE_URL } from "./config";
import { restoreBackendSession } from "./customAuth";

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
};

const buildHeaders = (hasBody: boolean, accessToken?: string) => ({
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  ...(hasBody ? { "Content-Type": "application/json" } : {})
});

const parseJson = async (response: Response) => {
  return response.json().catch(() => ({}));
};

export const requestBackendPublic = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(Boolean(options.body)),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await parseJson(response);
  if (!response.ok) {
    throw new Error(json?.message ?? json?.error ?? "Request failed");
  }

  return json as T;
};

export const requestBackendAuthed = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const session = await restoreBackendSession();
  if (!session?.accessToken) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(Boolean(options.body), session.accessToken),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await parseJson(response);
  if (!response.ok) {
    throw new Error(json?.message ?? json?.error ?? "Request failed");
  }

  return json as T;
};
