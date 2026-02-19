import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Shield, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Cargar email guardado si existe
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Conectar con tu API de backend
      const response = await axios.post('http://localhost:3001/api/login', {
        email,
        password,
      });

      if (response.status === 200) {
        // Guardar token si lo devuelve el backend
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        // Guardar preferencia de "recordarme"
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        } else {
          localStorage.removeItem('rememberEmail');
        }
        
        // Redirigir al dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Email o contraseña incorrectos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cinte-dark px-4 py-12 sm:px-6 lg:px-8">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cinte-green/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cinte-cyan/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative">
        {/* Tarjeta principal */}
        <div className="bg-cinte-card/95 rounded-2xl shadow-2xl p-8 space-y-6 border border-cinte-primary/20 backdrop-blur-sm">
          
          {/* Header con logo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-gradient-to-br from-cinte-primary to-cinte-purple rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <span className="text-white text-3xl font-bold drop-shadow-lg">C</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Bienvenido a CINTE</h1>
              <p className="text-gray-400 mt-1">Inicia sesión en tu cuenta</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-cinte-red/10 border border-cinte-red/30 text-cinte-red px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                Email corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@cinte.com"
                  className="w-full pl-10 pr-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-400">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cinte-cyan transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-cinte-dark text-cinte-cyan focus:ring-cinte-cyan focus:ring-offset-cinte-dark"
                />
                <span className="text-sm text-gray-400 group-hover:text-cinte-cyan transition-colors">
                  Recuérdame
                </span>
              </label>
              <Link 
                to="/forgot-password" 
                className="text-sm text-cinte-cyan hover:text-cinte-cyan/80 font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cinte-primary to-cinte-purple hover:from-cinte-purple hover:to-cinte-primary disabled:from-cinte-primary/50 disabled:to-cinte-purple/50 text-white font-medium py-3 px-4 rounded-lg transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-cinte-primary/25 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Request Access Link */}
          <p className="text-center text-gray-500 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/request-access" className="text-cinte-cyan hover:text-cinte-cyan/80 font-medium transition-colors">
              Solicita acceso aquí
            </Link>
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-600 pt-4 border-t border-cinte-primary/10">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-600" />
              <span>Conexión segura</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-gray-600" />
              <span>Capital Humano v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}