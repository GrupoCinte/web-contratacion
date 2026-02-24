import React, { useState } from 'react';
import { Mail, User, Building, ArrowLeft, Shield, Activity, FileText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function RequestAccess() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    empresa: '',
    cargo: '',
    telefono: '',
    motivo: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/request-access`, formData);
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.message || 'Error al enviar la solicitud');
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
        {/* Botón para volver al login */}
        <button
          onClick={() => navigate('/')}
          className="absolute -top-12 left-0 text-gray-400 hover:text-cinte-cyan transition-colors flex items-center space-x-2 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Volver al login</span>
        </button>

        {/* Tarjeta principal */}
        <div className="bg-cinte-card/95 rounded-2xl shadow-2xl p-8 space-y-6 border border-cinte-primary/20 backdrop-blur-sm">

          {/* Header con logo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-gradient-to-br from-cinte-primary to-cinte-purple rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-3xl font-bold drop-shadow-lg">C</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Solicita tu acceso</h1>
              <p className="text-gray-400 mt-1">
                Completa el formulario para crear tu cuenta
              </p>
            </div>
          </div>

          {/* Mensaje de éxito */}
          {success && (
            <div className="bg-cinte-green/10 border border-cinte-green/30 text-cinte-green px-4 py-3 rounded-lg text-sm">
              <p className="font-medium flex items-center space-x-2">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>¡Solicitud enviada!</span>
              </p>
              <p className="mt-2 ml-7">
                Te contactaremos a la brevedad con los detalles de tu cuenta.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="bg-cinte-red/10 border border-cinte-red/30 text-cinte-red px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre completo */}
              <div className="space-y-2">
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-400">
                  Nombre completo <span className="text-cinte-red">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Juan Pérez González"
                    className="w-full pl-10 pr-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                  Email corporativo <span className="text-cinte-red">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="juan.perez@empresa.com"
                    className="w-full pl-10 pr-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                    required
                  />
                </div>
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <label htmlFor="empresa" className="block text-sm font-medium text-gray-400">
                  Empresa <span className="text-cinte-red">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="empresa"
                    name="empresa"
                    type="text"
                    value={formData.empresa}
                    onChange={handleChange}
                    placeholder="Nombre de la empresa"
                    className="w-full pl-10 pr-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                    required
                  />
                </div>
              </div>

              {/* Cargo (opcional) */}
              <div className="space-y-2">
                <label htmlFor="cargo" className="block text-sm font-medium text-gray-400">
                  Cargo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="cargo"
                    name="cargo"
                    type="text"
                    value={formData.cargo}
                    onChange={handleChange}
                    placeholder="Ej: Gerente de RRHH"
                    className="w-full pl-10 pr-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                  />
                </div>
              </div>

              {/* Teléfono (opcional) */}
              <div className="space-y-2">
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-400">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+52 555 555 5555"
                  className="w-full px-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200"
                />
              </div>

              {/* Motivo (opcional) */}
              <div className="space-y-2">
                <label htmlFor="motivo" className="block text-sm font-medium text-gray-400">
                  ¿Por qué necesitas acceso?
                </label>
                <textarea
                  id="motivo"
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Cuéntanos brevemente para qué usarás la plataforma..."
                  className="w-full px-4 py-3 bg-cinte-dark border border-cinte-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinte-cyan focus:border-cinte-cyan text-white placeholder-gray-600 transition duration-200 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cinte-primary to-cinte-purple hover:from-cinte-purple hover:to-cinte-primary disabled:from-cinte-primary/50 disabled:to-cinte-purple/50 text-white font-medium py-3 px-4 rounded-lg transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-cinte-primary/25 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Enviando solicitud...</span>
                  </div>
                ) : (
                  'Enviar solicitud'
                )}
              </button>
            </form>
          )}

          {/* Footer con versión */}
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