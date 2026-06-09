import { useState } from 'react'

function Tooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        style={{
          width: '16px', height: '16px', borderRadius: '50%',
          border: '1.5px solid var(--gold-light)', backgroundColor: 'white',
          color: 'var(--gold)', fontSize: '10px', fontWeight: '700',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 0, flexShrink: 0,
          lineHeight: 1
        }}
      >
        ?
      </button>
      {visible && (
        <div style={{
          position: 'absolute', bottom: '22px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 100,
          backgroundColor: '#1A1A1A', color: 'white',
          fontSize: '11px', lineHeight: '1.5', padding: '8px 12px',
          borderRadius: '8px', width: '210px', textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          pointerEvents: 'none'
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent',
            borderTopColor: '#1A1A1A'
          }} />
        </div>
      )}
    </div>
  )
}

function ErrorMessage({ error }) {
  if (!error) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '5px' }}>
      <span style={{ fontSize: '12px', color: '#EF4444', lineHeight: '1.5' }}>
        ⚠ {error}
      </span>
    </div>
  )
}

export default function FormField({ field, value, onChange, error, onClearError }) {
  const hasError = !!error
  const hasIcon = !!field.icon

  const handleChange = (id, val) => {
    if (onClearError) onClearError(id)
    onChange(id, val)
  }

  const handleFocus = (e) => {
    if (!hasError) {
      e.target.closest('.field-wrapper').style.borderColor = 'var(--gold)'
      e.target.closest('.field-wrapper').style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1)'
    }
  }

  const handleBlur = (e) => {
    if (!hasError) {
      e.target.closest('.field-wrapper').style.borderColor = 'var(--gold-light)'
      e.target.closest('.field-wrapper').style.boxShadow = 'none'
    }
  }

  const wrapperStyle = {
    display: 'flex', alignItems: 'center',
    border: `1px solid ${hasError ? '#F87171' : 'var(--gold-light)'}`,
    borderRadius: '8px', backgroundColor: 'white',
    overflow: 'hidden', transition: 'all 0.2s',
    boxShadow: hasError ? '0 0 0 3px rgba(248,113,113,0.1)' : 'none',
  }

  const iconContainerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '42px', flexShrink: 0, alignSelf: 'stretch',
    borderRight: `1px solid ${hasError ? '#FECACA' : 'var(--gold-light)'}`,
    backgroundColor: '#FBF7EF',
    fontSize: '15px'
  }

  const inputStyle = {
    flex: 1, border: 'none', outline: 'none',
    padding: '11px 14px', fontSize: '13px',
    backgroundColor: 'white', color: 'var(--charcoal)',
    fontFamily: 'Inter, sans-serif',
  }

  const Label = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
      <label style={{
        fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: hasError ? '#EF4444' : 'var(--charcoal)'
      }}>
        {field.label}
        {field.required && <span style={{ color: 'var(--gold)', marginLeft: '2px' }}>*</span>}
      </label>
      {field.tooltip && <Tooltip text={field.tooltip} />}
    </div>
  )

  // text, email, tel, number, date, time
  if (['text', 'email', 'tel', 'number', 'date', 'time'].includes(field.type)) {
    return (
      <div>
        <Label />
        <div className="field-wrapper" style={wrapperStyle}>
          {hasIcon && (
            <div style={iconContainerStyle}>{field.icon}</div>
          )}
          <input
            type={field.type}
            value={value || ''}
            placeholder={field.placeholder || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={inputStyle}
          />
          {hasError && (
            <span style={{ padding: '0 12px', fontSize: '15px' }}>⚠️</span>
          )}
        </div>
        <ErrorMessage error={error} />
      </div>
    )
  }

  // textarea
  if (field.type === 'textarea') {
    const [charCount, setCharCount] = useState(0)
    return (
      <div>
        <Label />
        <div style={{
          border: `1px solid ${hasError ? '#F87171' : 'var(--gold-light)'}`,
          borderRadius: '8px', backgroundColor: 'white', overflow: 'hidden',
          transition: 'all 0.2s',
          boxShadow: hasError ? '0 0 0 3px rgba(248,113,113,0.1)' : 'none',
        }}>
          <textarea
            rows={3}
            value={value || ''}
            placeholder={field.placeholder || ''}
            onChange={(e) => {
              handleChange(field.id, e.target.value)
              setCharCount(e.target.value.length)
            }}
            onFocus={(e) => {
              if (!hasError) {
                e.target.closest('div').style.borderColor = 'var(--gold)'
                e.target.closest('div').style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1)'
              }
            }}
            onBlur={(e) => {
              if (!hasError) {
                e.target.closest('div').style.borderColor = 'var(--gold-light)'
                e.target.closest('div').style.boxShadow = 'none'
              }
            }}
            style={{
              width: '100%', border: 'none', outline: 'none',
              padding: '11px 14px', fontSize: '13px', resize: 'none',
              backgroundColor: 'white', color: 'var(--charcoal)',
              fontFamily: 'Inter, sans-serif', lineHeight: '1.6',
              boxSizing: 'border-box'
            }}
          />
          <div style={{
            padding: '4px 12px 6px', textAlign: 'right',
            borderTop: '1px solid #F5ECD7'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--gold-light)' }}>
              {charCount} caracteres
            </span>
          </div>
        </div>
        <ErrorMessage error={error} />
      </div>
    )
  }

  // radio
  if (field.type === 'radio') {
    return (
      <div>
        <Label />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {field.options.map((option) => {
            const isSelected = value === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleChange(field.id, option)}
                style={{
                  padding: '8px 20px', borderRadius: '999px', fontSize: '13px',
                  fontWeight: isSelected ? '500' : '400',
                  transition: 'all 0.2s', cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--gold)' : hasError ? '#F87171' : 'var(--gold-light)'}`,
                  backgroundColor: isSelected ? 'var(--gold)' : 'white',
                  color: isSelected ? 'white' : 'var(--charcoal)',
                  boxShadow: isSelected ? '0 2px 8px rgba(201,168,76,0.25)' : 'none',
                }}
              >
                {option}
              </button>
            )
          })}
        </div>
        <ErrorMessage error={error} />
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
      <div>
        <Label />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {field.options.map((option) => {
            const isSelected = selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                style={{
                  padding: '8px 16px', borderRadius: '999px', fontSize: '13px',
                  fontWeight: isSelected ? '500' : '400',
                  transition: 'all 0.2s', cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--gold)' : hasError ? '#F87171' : 'var(--gold-light)'}`,
                  backgroundColor: isSelected ? 'var(--gold)' : 'white',
                  color: isSelected ? 'white' : 'var(--charcoal)',
                  boxShadow: isSelected ? '0 2px 8px rgba(201,168,76,0.25)' : 'none',
                }}
              >
                {isSelected ? '✓ ' : ''}{option}
              </button>
            )
          })}
        </div>
        <ErrorMessage error={error} />
      </div>
    )
  }

  return null
}