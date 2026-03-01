"use client"

import { AlertTriangle } from "lucide-react"

export default function RateLimitExceeded() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-normal text-gray-900 mb-4">
          Limite de Solicitações Excedido
        </h1>
        
        <p className="text-gray-600 mb-6">
          Você excedeu o limite de solicitações permitidas. 
          Aguarde alguns minutos antes de tentar novamente.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">
            <strong>Tempo de espera:</strong> 15 minutos
          </p>
          <p className="text-sm text-red-600 mt-1">
            Esta medida protege nossos sistemas contra uso excessivo.
          </p>
        </div>
        
        <button
          onClick={() => window.history.back()}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-normal py-2 px-4 rounded-lg transition-colors"
        >
          Voltar
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          Se você acredita que isso é um erro, entre em contato com o suporte.
        </p>
      </div>
    </div>
  )
} 