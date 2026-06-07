import api from '../api/client'

export const settingsService = {
  async get() {
    const { data } = await api.get('/settings')
    return data.data
  },

  async update(payload) {
    const { data } = await api.put('/settings', payload)
    return data.data
  },
}
