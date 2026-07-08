import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // To handle initial load

  useEffect(() => {
    // Check local storage for existing session on app load
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (credentials, role) => {
    const endpoint = role === 'patient' 
      ? 'http://localhost:5000/api/patients/login'
      : 'http://localhost:5000/api/labs/login';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      // IMPORTANT: Allows the backend to set the refreshToken cookie
      credentials: 'include' 
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    const userWithRole={
      ...data.user,
      role:role
    }
    // Save access token and user info
    setToken(data.accessToken);
    setUser(userWithRole);
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(userWithRole));

    return data;
  };

  const logout = async () => {
    try {
      // Tell backend to clear cookie and blacklist token
      await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);