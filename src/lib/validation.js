// ─── Validadores individuais ───

const isValidPhone = (value) => {
  const cleaned = value.replace(/\s/g, '')
  return /^(9[1236]\d{7}|2\d{8})$/.test(cleaned)
}

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const isValidFutureDate = (value) => {
  if (!value) return false
  const date = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
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