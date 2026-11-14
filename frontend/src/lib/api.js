import axios from "axios";

// In dev, Vite proxies /api to the backend (see vite.config.js). In the Docker build the
// frontend is served by Express, so relative URLs work there too.
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ""}/api`,
});

let getToken = async () => null;

// Called once from the app root with Clerk's getToken, so every request is authenticated.
export function setTokenGetter(fn) {
  getToken = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(err, fallback = "Something went wrong") {
  return err?.response?.data?.message ?? fallback;
}
