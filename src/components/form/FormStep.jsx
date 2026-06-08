import { useEffect, useRef } from 'react'
import FormField from './FormField'

export default function FormStep({ step, formData, onChange, errors, onClearError }) {
  const containerRef = useRef(null)
  const errorCount = Object.keys(errors || {}).length

  // Scroll automático até ao primeiro campo com erro
  useEffect(() => {
    if (errorCount > 0 && containerRef.current) {
      const firstErrorField = containerRef.current.querySelector('[data-has-error="true"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [errors])

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Título do passo */}
      <div style={{ marginBottom: '4px' }}>
        <h2 style={{ fontSize: '22px', color: 'var(--charcoal)', margin: '0 0 4px 0' }}>
          {step.title}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--gray-mid)', margin: 0 }}>
          {step.subtitle}
        </p>
      </div>

      {/* Resumo de erros */}
      {errorCount > 0 && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '10px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>
            {errorCount === 1
              ? '1 campo precisa de atenção antes de avançar'
              : `${errorCount} campos precisam de atenção antes de avançar`}
          </p>
        </div>
      )}

      {/* Campos */}
      {step.fields.map((field) => (
        <div key={field.id} data-has-error={!!errors?.[field.id]}>
          <FormField
            field={field}
            value={formData[field.id]}
            onChange={onChange}
            error={errors?.[field.id]}
            onClearError={onClearError}
          />
        </div>
      ))}
    </div>
  )
}