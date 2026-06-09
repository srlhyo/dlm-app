import { useEffect, useRef } from 'react'
import FormField from './FormField'

export default function FormStep({ step, formData, onChange, errors, onClearError }) {
  const containerRef = useRef(null)
  const errorCount = Object.keys(errors || {}).length

  useEffect(() => {
    if (errorCount > 0 && containerRef.current) {
      const firstError = containerRef.current.querySelector('[data-has-error="true"]')
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [errors])

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Resumo de erros */}
      {errorCount > 0 && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '10px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
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