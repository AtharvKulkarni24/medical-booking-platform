/**
 * API Client - Centralized API calls with axios
 */

import type { AuthResponse, LoginFormData, RegisterFormData, User } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create a custom fetch wrapper with token handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  private setAuthToken(token: string): void {
    localStorage.setItem("accessToken", token);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || error.error || "API request failed");
    }

    return response.json();
  }

  // Auth Endpoints
  async login(email: string, password: string, role: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });

    if (response.accessToken) {
      this.setAuthToken(response.accessToken);
    }

    return response;
  }

  async register(data: RegisterFormData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.accessToken) {
      this.setAuthToken(response.accessToken);
    }

    return response;
  }

  async logout(): Promise<void> {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  async getCurrentUser(): Promise<User> {
    const endpoint =
      localStorage.getItem("userRole") === "lab" ? "/labs/profile" : "/patients/profile";

    return this.request<User>(endpoint, {
      method: "GET",
    });
  }

  // Lab Endpoints
  async getLabProfile(): Promise<any> {
    return this.request("/labs/profile", { method: "GET" });
  }

  async updateLabProfile(data: any): Promise<any> {
    return this.request("/labs/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getLabSlots(): Promise<any> {
    return this.request("/labs/slots", { method: "GET" });
  }

  async getLabSlotById(slotId: string): Promise<any> {
    return this.request(`/labs/slots/${slotId}`, { method: "GET" });
  }

  async createLabSlot(data: any): Promise<any> {
    return this.request("/labs/slots", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLabSlot(slotId: string, data: any): Promise<any> {
    return this.request(`/labs/slots/${slotId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteLabSlot(slotId: string): Promise<any> {
    return this.request(`/labs/slots/${slotId}`, { method: "DELETE" });
  }

  // Patient Endpoints
  async getPatientProfile(): Promise<any> {
    return this.request("/patients/profile", { method: "GET" });
  }

  async updatePatientProfile(data: any): Promise<any> {
    return this.request("/patients/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getPatientBookings(): Promise<any> {
    return this.request("/patients/bookings", { method: "GET" });
  }

  async bookTest(data: any): Promise<any> {
    return this.request("/patients/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Search Endpoints
  async searchLabs(query: string): Promise<any> {
    return this.request(`/search/labs?q=${encodeURIComponent(query)}`, {
      method: "GET",
    });
  }

  async searchTests(query: string): Promise<any> {
    return this.request(`/search/tests?q=${encodeURIComponent(query)}`, {
      method: "GET",
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
