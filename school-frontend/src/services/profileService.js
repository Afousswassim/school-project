import api from '../api/client'

export const profileService = {
  async get() {
    const { data } = await api.get('/profile')
    return data.data
  },
  async update(payload) {
    const { data } = await api.put('/profile', payload)
    return data.data
  },
  async uploadPhoto(file) {
    const formData = new FormData()
    formData.append('photo', file)
    const { data } = await api.post('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
  async changePassword(payload) {
    const { data } = await api.put('/profile/password', payload)
    return data
  },
}
