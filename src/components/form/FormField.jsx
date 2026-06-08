import { useEffect, useRef } from 'react'

export default function FormField({ field, value, onChange, error, onClearError }) {
  const fieldRef = useRef(null)

  // Quando há erro, o campo já está visível — o scroll é feito pelo FormStep
  const hasError = !!error

  const baseInput = `w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-white`

  const getBorderStyle = (focused = false) => {
    if (hasError) return {
      border: '1.5px solid #F87171',
      boxShadow: '0 0 0 3px rgba(248,113,113,0.12)'
    }
    if (focused) return {
      border: '1.5px solid var(--gold)',
      boxShadow: '0 0 0 3px rgba(201,168,76,0.15)'
    }
    return { border: '1.5px solid var(--gold-light)' }
  }

  const handleFocus = (e) => {
    if (!hasError) {
      e.target.style.borderColor = 'var(--gold)'
      e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)'
    }
  }

  const handleBlur = (e) => {
    if (!hasError) {
      e.target.style.borderColor = 'var(--gold-light)'
      e.target.style.boxShadow = 'none'
    }
  }

  const handleChange = (id, val) => {
    if (onClearError) onClearError(id)
    onChange(id, val)
  }

  const ErrorMessage = () => hasError ? (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      marginTop: '6px', animation: 'fadeIn 0.2s ease'
    }}>
      <span style={{ fontSize: '13px', color: '#EF4444', lineHeight: '1.4' }}>
        ⚠ {error}
      </span>
    </div>
  ) : null

  // texto, email, tel, number, date, time
  if (['text', 'email', 'tel', 'number', 'date', 'time'].includes(field.type)) {
    return (
      <div ref={fieldRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{
          fontSize: '13px', fontWeight: '500',
          color: hasError ? '#EF4444' : 'var(--charcoal)'
        }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--gold)', marginLeft: '2px' }}>*</span>}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={baseInput}
            style={getBorderStyle()}
          />
          {hasError && (
            <span style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)', fontSize: '16px'
            }}>
              ⚠️
            </span>
          )}
        </div>
        <ErrorMessage />
      </div>
    )
  }

  // textarea
  if (field.type === 'textarea') {
    return (
      <div ref={fieldRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{
          fontSize: '13px', fontWeight: '500',
          color: hasError ? '#EF4444' : 'var(--charcoal)'
        }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--gold)', marginLeft: '2px' }}>*</span>}
        </label>
        <textarea
          rows={3}
          value={value || ''}
          onChange={(e) => handleChange(field.id, e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`${baseInput} resize-none`}
          style={getBorderStyle()}
        />
        <ErrorMessage />
      </div>
    )
  }

  // radio
  if (field.type === 'radio') {
    return (
      <div ref={fieldRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{
          fontSize: '13px', fontWeight: '500',
          color: hasError ? '#EF4444' : 'var(--charcoal)'
        }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--gold)', marginLeft: '2px' }}>*</span>}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {field.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleChange(field.id, option)}
              style={{
                padding: '8px 20px', borderRadius: '999px', fontSize: '13px',
                transition: 'all 0.2s', cursor: 'pointer',
                border: value === option
                  ? '1.5px solid var(--gold)'
                  : hasError
                    ? '1.5px solid #F87171'
                    : '1.5px solid var(--gold-light)',
                backgroundColor: value === option ? 'var(--gold)' : 'white',
                color: value === option ? 'white' : 'var(--charcoal)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <ErrorMessage />
      </div>
    )
  }

  // checkbox
  if (field.type === 'checkbox') {
    const selected = value || []
    const toggle = (option) => {
      const next = selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option]
      handleChange(field.id, next)
    }

    return (
      <div ref={fieldRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{
          fontSize: '13px', fontWeight: '500',
          color: hasError ? '#EF4444' : 'var(--charcoal)'
        }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--gold)', marginLeft: '2px' }}>*</span>}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {field.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              style={{
                padding: '8px 16px', borderRadius: '999px', fontSize: '13px',
                transition: 'all 0.2s', cursor: 'pointer',
                border: selected.includes(option)
                  ? '1.5px solid var(--gold)'
                  : hasError
                    ? '1.5px solid #F87171'
                    : '1.5px solid var(--gold-light)',
                backgroundColor: selected.includes(option) ? 'var(--gold)' : 'white',
                color: selected.includes(option) ? 'white' : 'var(--charcoal)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <ErrorMessage />
      </div>
    )
  }

  return null
}