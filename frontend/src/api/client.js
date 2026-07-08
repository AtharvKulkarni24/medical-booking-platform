const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(error.message || error.error || "API request failed");
    }

    return response.json();
  },

  async login(email, password, role) {
    const endpoint =
      role === "lab" ? "/auth/labs/login" : "/auth/patients/login";
    const res = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.accessToken) {
      localStorage.setItem("accessToken", res.accessToken);
    }

    return res;
  },

  async getCurrentUser() {
    const role = localStorage.getItem("userRole");
    const endpoint = role === "lab" ? "/labs/profile" : "/patients/profile";
    return this.request(endpoint, { method: "GET" });
  },
};
