import api from '../api/client'

export const resourceService = {
  async list(resource, params) {
    const { data } = await api.get(`/${resource}`, { params })
    return data.data
  },
  async create(resource, payload) {
    const { data } = await api.post(`/${resource}`, payload)
    return data.data
  },
  async update(resource, id, payload) {
    const { data } = await api.put(`/${resource}/${id}`, payload)
    return data.data
  },
  async remove(resource, id) {
    const { data } = await api.delete(`/${resource}/${id}`)
    return data.data
  },
}
