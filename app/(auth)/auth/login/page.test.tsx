import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// mock do serviço de autenticação
vi.mock('services/authService', () => ({
  loginWithPassword: vi.fn(),
}))

import LoginPage from './page'
import { loginWithPassword } from '@/services/authService'

describe('LoginPage', () => {
  it('submete credenciais e chama loginWithPassword', async () => {
    ;(loginWithPassword as any).mockResolvedValue({ user: { id: 'u1' }, profile: { role: 'astronauta' } })

    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    await waitFor(() => {
      expect(loginWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'x', rememberMe: false })
    })
  })

  it('exibe erro quando o serviço rejeita', async () => {
    ;(loginWithPassword as any).mockRejectedValue(new Error('E-mail ou senha inválidos.'))

    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'bad@b.com' } })
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
  })
})