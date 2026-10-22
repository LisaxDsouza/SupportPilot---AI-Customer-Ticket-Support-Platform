export type UserRole = 'EMPLOYEE' | 'SUPPORT_ENGINEER' | 'ADMIN';

export interface User {
  user_id: number;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  department: string;
  role: UserRole;
}

export interface RoleVerification {
  user_id: number;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
  allowed_routes: string[];
}

