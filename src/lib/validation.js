// ─── Validadores individuais ───

// Aceita números portugueses (9 dígitos, com ou sem +351/00351) e
// qualquer número estrangeiro com indicativo (+44..., 0044...). A Nádia
// fala por WhatsApp com clientes de qualquer país; a restrição antiga
// a 9 dígitos PT bloqueava clientes no estrangeiro.
const isValidPhone = (value) => {
  const cleaned = String(value).replace(/[\s\-().]/g, '')
  // Português sem indicativo: 9 dígitos (9x ou 2x)
  if (/^(9[1236]\d{7}|2\d{8})$/.test(cleaned)) return true
  // Com indicativo internacional: + ou 00, seguido de 6 a 15 dígitos
  return /^(\+|00)\d{6,15}$/.test(cleaned)
}

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Compara as datas como texto ISO (yyyy-mm-dd) no fuso local do
// cliente — comparar objetos Date misturava UTC com hora local e podia
// rejeitar "hoje" em fusos horários à frente de Lisboa.
const isValidFutureDate = (value) => {
  if (!value) return false
  const h = new Date()
  const hoje = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
  return String(value) >= hoje
}

const isValidPositive = (value) => {
  return value !== '' && value !== null && value !== undefined && Number(value) > 0
}

// ─── Validar um campo individual ───

export const validateField = (field, value) => {
  if (!field.required && !field.validate) return null

  // Checkbox e radio — verificar se tem valor
  if (field.type === 'checkbox') {
    if (field.required && (!value || value.length === 0)) {
      return field.errorMsg
    }
    return null
  }

  if (field.type === 'radio') {
    if (field.required && !value) {
      return field.errorMsg
    }
    return null
  }

  // Campos de texto — verificar se está vazio
  if (field.required && (!value || String(value).trim() === '')) {
    return field.errorMsg
  }

  // Validações específicas
  if (value && field.validate === 'phone' && !isValidPhone(value)) {
    return field.errorMsg
  }

  if (value && field.validate === 'email' && !isValidEmail(value)) {
    return field.errorMsg
  }

  if (value && field.validate === 'futureDate' && !isValidFutureDate(value)) {
    return field.errorMsg
  }

  if (value && field.validate === 'positive' && !isValidPositive(value)) {
    return field.errorMsg
  }

  return null
}

// ─── Validar um passo inteiro ───

export const validateStep = (step, formData) => {
  const errors = {}

  step.fields.forEach((field) => {
    const error = validateField(field, formData[field.id])
    if (error) errors[field.id] = error
  })

  return errors
}