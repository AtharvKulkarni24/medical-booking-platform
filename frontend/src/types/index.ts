/**
 * User Types - Authentication and User Roles
 */

export type UserRole = "patient" | "lab" | "admin";

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface PatientUser extends User {
  role: "patient";
  phone?: string;
  date_of_birth?: string;
  medical_history?: string;
}

export interface LabUser extends User {
  role: "lab";
  name?: string;
  address_text?: string;
  latitude?: number;
  longitude?: number;
  auth_document_url?: string;
  is_verified?: boolean;
  average_rating?: number;
}

/**
 * Lab & Test Types
 */

export interface Lab {
  lab_id: string;
  name: string;
  email: string;
  address_text: string;
  latitude: number;
  longitude: number;
  auth_document_url?: string;
  is_verified: boolean;
  average_rating: number;
}

export interface TimeSlot {
  slot_id: string;
  lab_id: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
}

export interface MedicalTest {
  test_id: string;
  lab_id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  created_at?: string;
}

/**
 * Booking Types
 */

export interface Booking {
  booking_id: string;
  patient_id: string;
  slot_id: string;
  test_id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  booked_at: string;
  appointment_date?: string;
  notes?: string;
}

/**
 * API Request/Response Types
 */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode?: number;
}

/**
 * Form Types
 */

export interface LoginFormData {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  phone?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
}
