/* important: API client for communicating with the Express backend.
 * Provides a fetch wrapper that automatically attaches the JWT token
 * and throws typed ApiError on non-2xx responses. */
const API_URL = 'http://localhost:3000';

/* nota bene: Custom error class that carries the HTTP status code
 * so callers can differentiate 401/403/409/500 errors. */
export class ApiError extends Error {
    status: number;
    data: any;
    constructor(message: string, status: number, data?: any) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

/* note: Makes an HTTP request to the API.
 * Automatically includes the JWT token from localStorage if available.
 * Throws ApiError for non-OK responses instead of trying to handle them here. */
export async function api(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(data.error || 'Request failed', res.status, data);
    }
    return data;
}
