import React, { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './AuthPage.css'

export function SignupPage() {
  const { signup, currentUser } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (currentUser) return <Navigate to="/editor" replace />

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const result = signup({ companyName, email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/editor', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ AIRWAYBILL APP</div>
        <p className="auth-sub">Crea tu cuenta de empresa y empieza a generar AWBs.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Empresa</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ej: Cargo Andes SpA" />
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operaciones@empresa.com" />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit">
            Crear cuenta
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
