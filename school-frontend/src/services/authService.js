import api from '../api/client'

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    return data.data
  },
  async me() {
    const { data } = await api.get('/auth/me')
    return data.data
  },
}
