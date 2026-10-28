const API_BASE = '/api'

let authToken = localStorage.getItem('token') || ''

export function setToken(token) {
  authToken = token
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function getToken() {
  return authToken
}

async function request(method, path, body, { isForm = false } = {}) {
  const headers = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const err = new Error(data?.message || `请求失败（${res.status}）`)
    err.status = res.status
    err.code = data?.error
    throw err
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, { isForm: true }),
}
