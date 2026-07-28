import { getApiOrigin } from "./runtime";

export type ApiClientError<TError = unknown> = Error & {
  info?: TError;
  status?: number;
};

export type ErrorType<TError> = ApiClientError<TError>;

export async function apiFetch<TData, TError = unknown>(
  url: string,
  options: RequestInit,
): Promise<TData> {
  const requestUrl = url.startsWith("/") ? `${getApiOrigin()}${url}` : url;
  const response = await fetch(requestUrl, options);
  const body = [204, 205, 304].includes(response.status)
    ? null
    : await response.text();
  const data = body === null || body === "" ? undefined : JSON.parse(body);

  if (!response.ok) {
    const error: ApiClientError<TError> = new Error(
      `API request failed with status ${response.status}`,
    );
    error.info = data as TError;
    error.status = response.status;
    throw error;
  }

  return data as TData;
}
