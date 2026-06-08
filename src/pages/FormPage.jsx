import { useState } from 'react'
import { formSteps } from '../data/formSteps'
import ProgressBar from '../components/form/ProgressBar'
import FormStep from '../components/form/FormStep'
import { supabase } from '../lib/supabase'
import { validateStep } from '../lib/validation'

export default function FormPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const totalSteps = formSteps.length
  const step = formSteps[currentStep - 1]

  const handleChange = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleClearError = (fieldId) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  const handleNext = () => {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      // Scroll ao topo do card para ver o resumo de erros
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors({})
    setCurrentStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setErrors({})
    if (currentStep > 1) setCurrentStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      nome_noivo: formData.nomeNoivo,
      nome_noiva: formData.nomeNoiva,
      contacto_principal: formData.contactoPrincipal,
      email: formData.email,
      morada: formData.morada,
      data_evento: formData.dataEvento || null,
      local_evento: formData.localEvento,
      numero_convidados: formData.numeroConvidados ? parseInt(formData.numeroConvidados) : null,
      hora_inicio: formData.horaInicio || null,
      hora_termino: formData.horaTermino || null,
      hora_montagem: formData.horaMontagem || null,
      hora_limite_montagem: formData.horaLimiteMontagem || null,
      hora_recolha: formData.horaRecolha || null,
      recolha_dia_seguinte: formData.recolhaDiaSeguinte,
      nome_responsavel: formData.nomeResponsavel,
      contacto_responsavel: formData.contactoResponsavel,
      relacao_responsavel: formData.relacaoResponsavel,
      estilo_evento: formData.estiloEvento || [],
      estilo_outro: formData.estiloOutro,
      paleta_cores: formData.paletaCores || [],
      paleta_observacoes: formData.paletaObservacoes,
      mesa_noivos: formData.mesaNoivos || [],
      cartoes_pratos: formData.cartoesPratos,
      observacoes_cartoes: formData.observacoesCartoes,
      descricao_mesa_noivos: formData.descricaoMesaNoivos,
      cenario_palco: formData.cenarioPalco || [],
      descricao_cenario: formData.descricaoCenario,
      medidas_espaco: formData.medidasEspaco,
      centros_mesa: formData.centrosMesa || [],
      tipo_flores: formData.tipoFlores || [],
      numero_mesas: formData.numeroMesas ? parseInt(formData.numeroMesas) : null,
      formato_mesas: formData.formatoMesas,
      lugares_por_mesa: formData.lugaresporMesa ? parseInt(formData.lugaresporMesa) : null,
      observacoes_mesas: formData.observacoesMesas,
      texto_principal_placa: formData.textoPrincipalPlaca,
      texto_secundario_placa: formData.textoSecundarioPlaca,
      estilo_placa: formData.estiloPlaca || [],
      notas_placa: formData.notasPlaca,
      morada_exacta: formData.moradaExacta,
      pessoa_abre_espaco: formData.pessoaAbreEspaco,
      contacto_pessoa_abre: formData.contactoPessoaAbre,
      acesso_local: formData.acessoLocal || [],
      notas_acesso: formData.notasAcesso,
      observacoes_gerais: formData.observacoesGerais,
    }

    const { error } = await supabase.from('submissions').insert([payload])

    if (error) {
      setError('Ocorreu um erro ao submeter. Por favor tenta novamente.')
      console.error(error)
    } else {
      setSubmitted(true)
    }

    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="bg-white rounded-2xl p-10 text-center" style={{ maxWidth: '420px', width: '100%', boxShadow: '0 2px 24px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>💍</div>
          <h2 style={{ fontSize: '24px', color: 'var(--gold)', marginBottom: '12px', fontFamily: 'Playfair Display, serif' }}>
            Obrigado!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-mid)', lineHeight: '1.6', marginBottom: '24px' }}>
            O vosso questionário foi submetido com sucesso. Entraremos em contacto brevemente para confirmar todos os detalhes do vosso dia especial.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Planeamento · Personalização · Organização · Detalhes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--cream)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', color: 'var(--gold)', fontFamily: 'Playfair Display, serif', margin: '0 0 4px 0' }}>
            Do Luxo à Mesa
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Questionário dos Noivos
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 2px 24px rgba(0,0,0,0.07)' }}>

          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepTitle={step.title}
          />

          <FormStep
            step={step}
            formData={formData}
            onChange={handleChange}
            errors={errors}
            onClearError={handleClearError}
          />

          {error && (
            <p style={{ fontSize: '13px', color: '#EF4444', textAlign: 'center', marginTop: '16px' }}>{error}</p>
          )}

          {/* Navegação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              style={{
                padding: '10px 24px', borderRadius: '999px', fontSize: '13px',
                border: `1.5px solid ${currentStep === 1 ? 'var(--gold-light)' : 'var(--gold)'}`,
                color: currentStep === 1 ? 'var(--gold-light)' : 'var(--gold)',
                backgroundColor: 'white', cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ← Anterior
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                style={{
                  padding: '10px 32px', borderRadius: '999px', fontSize: '13px',
                  backgroundColor: 'var(--gold)', color: 'white', border: 'none',
                  cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500'
                }}
              >
                Seguinte →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 32px', borderRadius: '999px', fontSize: '13px',
                  backgroundColor: submitting ? 'var(--gold-light)' : 'var(--gold)',
                  color: 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', fontWeight: '500'
                }}
              >
                {submitting ? 'A enviar...' : 'Submeter ✓'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '24px', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Planeamento · Personalização · Organização · Detalhes
        </p>

      </div>
    </div>
  )
}