import api from '../api/client'

export const dashboardService = {
  async getStats() {
    const { data } = await api.get('/dashboard/stats')
    return data.data
  },
}
