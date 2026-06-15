import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/* ===== Ícones SVG dourados (linha fina) ===== */
function IconCal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  )
}
function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}
function IconGuests() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M16 8.5a3 3 0 100-6M21 20c0-2.6-1.8-4.4-4.5-4.9" />
    </svg>
  )
}
function IconPrint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" />
      <path d="M6 18H4a2 2 0 01-2-2v-3a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2h-2" />
    </svg>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '28px', breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ height: '1px', flex: 1, backgroundColor: '#C9A84C' }} />
        <p style={{ fontSize: '10px', fontWeight: '700', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0, whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <div style={{ height: '1px', flex: 1, backgroundColor: '#C9A84C' }} />
      </div>
      <div className="briefing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  if (!value && value !== 0) return null
  const display = Array.isArray(value) ? value.join(', ') : String(value)
  if (!display || display === '') return null
  return (
    <div style={{ borderBottom: '1px solid #F5ECD7', paddingBottom: '8px' }}>
      <p style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px 0' }}>
        {label}
      </p>
      <p style={{ fontSize: '12px', color: '#1A1A1A', margin: 0, lineHeight: '1.5' }}>
        {display}
      </p>
    </div>
  )
}

function FieldFull({ label, value }) {
  if (!value && value !== 0) return null
  const display = Array.isArray(value) ? value.join(', ') : String(value)
  if (!display || display === '') return null
  return (
    <div style={{ borderBottom: '1px solid #F5ECD7', paddingBottom: '8px', gridColumn: '1 / -1' }}>
      <p style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px 0' }}>
        {label}
      </p>
      <p style={{ fontSize: '12px', color: '#1A1A1A', margin: 0, lineHeight: '1.5' }}>
        {display}
      </p>
    </div>
  )
}

export default function BriefingPage() {
  const { id } = useParams()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single()
      setSubmission(data)
      setLoading(false)
    }
    fetch()
  }, [id])

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('pt-PT', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <p style={{ color: '#6B7280', fontSize: '14px' }}>A carregar briefing...</p>
    </div>
  )

  if (!submission) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <p style={{ color: '#6B7280', fontSize: '14px' }}>Briefing não encontrado.</p>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #FAFAF8; }

        .briefing-toolbar {
          position: fixed; top: 20px; right: 20px; z-index: 100;
        }
        .briefing-print-btn {
          padding: 11px 22px; border-radius: 10px; font-size: 13px;
          font-weight: 600; cursor: pointer;
          background-color: #C9A84C; color: white; border: none;
          box-shadow: 0 4px 16px rgba(201,168,76,0.4);
          font-family: 'Inter, sans-serif';
          display: inline-flex; align-items: center; gap: 8px;
        }
        .briefing-hint { display: none; }

        .briefing-header {
          background-color: #C9A84C; padding: 28px 40px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }

        @media (max-width: 600px) {
          .briefing-toolbar {
            position: static; padding: 12px 16px 0;
          }
          .briefing-print-btn {
            width: 100%; justify-content: center; padding: 13px;
            font-size: 14px;
          }
          .briefing-hint {
            display: block; text-align: center;
            font-size: 11px; color: #6B7280;
            margin: 8px 16px 0; line-height: 1.5;
          }
          .briefing-header {
            flex-direction: column; align-items: flex-start;
            gap: 10px; padding: 22px 22px;
          }
          .briefing-header-date { text-align: left !important; }
          .briefing-grid { grid-template-columns: 1fr !important; }
          .briefing-body { padding: 22px !important; }
          .briefing-names { padding: 22px 22px 18px !important; }
          .briefing-footer {
            flex-direction: column !important; align-items: flex-start !important;
            gap: 6px; padding: 16px 22px !important;
          }
        }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Toolbar — botão imprimir/guardar */}
      <div className="briefing-toolbar no-print">
        <button className="briefing-print-btn" onClick={() => window.print()}>
          <IconPrint /> Imprimir / Guardar PDF
        </button>
        <p className="briefing-hint">
          No telemóvel, escolhe “Guardar como PDF” no destino da impressão.
        </p>
      </div>

      <div className="briefing-outer" style={{ padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div className="page" style={{
          backgroundColor: 'white', maxWidth: '720px', margin: '0 auto',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 8px 48px rgba(0,0,0,0.08)'
        }}>

          {/* Cabeçalho dourado */}
          <div className="briefing-header">
            <div>
              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '22px', color: 'white',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                margin: '0 0 2px 0'
              }}>
                Do Luxo à Mesa
              </h1>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>
                by Luxury Events
              </p>
            </div>
            <div className="briefing-header-date" style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px 0' }}>
                Briefing do Evento
              </p>
              <p style={{ fontSize: '12px', color: 'white', fontWeight: '500', margin: 0 }}>
                {new Date().toLocaleDateString('pt-PT')}
              </p>
            </div>
          </div>

          {/* Nome dos noivos */}
          <div className="briefing-names" style={{ padding: '28px 40px 20px', borderBottom: '1px solid #F5ECD7' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '28px', color: '#1A1A1A',
              margin: '0 0 10px 0'
            }}>
              {submission.nome_noivo} & {submission.nome_noiva}
            </h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconCal /> {formatDate(submission.data_evento)}
              </p>
              {submission.local_evento && (
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconPin /> {submission.local_evento}
                </p>
              )}
              {submission.numero_convidados && (
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconGuests /> {submission.numero_convidados} convidados
                </p>
              )}
            </div>

            <div style={{ marginTop: '12px' }}>
              <span style={{
                fontSize: '11px', padding: '4px 12px', borderRadius: '999px',
                backgroundColor: '#FEF9EC', color: '#C9A84C',
                border: '1px solid #E8D5A3', fontWeight: '500'
              }}>
                {submission.status}
              </span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="briefing-body" style={{ padding: '28px 40px' }}>

            <Section title="Horários">
              <Field label="Hora de Início" value={submission.hora_inicio} />
              <Field label="Hora de Término" value={submission.hora_termino} />
              <Field label="Hora de Montagem" value={submission.hora_montagem} />
              <Field label="Hora Limite de Montagem" value={submission.hora_limite_montagem} />
              <Field label="Hora de Recolha" value={submission.hora_recolha} />
              <Field label="Recolha no Dia Seguinte" value={submission.recolha_dia_seguinte} />
            </Section>

            <Section title="Contactos">
              <Field label="Contacto Principal" value={submission.contacto_principal} />
              <Field label="Email" value={submission.email} />
              <Field label="Responsável no Dia" value={submission.nome_responsavel} />
              <Field label="Contacto do Responsável" value={submission.contacto_responsavel} />
              <Field label="Relação com os Noivos" value={submission.relacao_responsavel} />
            </Section>

            <Section title="Estilo e Cores">
              <FieldFull label="Estilo do Evento" value={submission.estilo_evento} />
              <FieldFull label="Paleta de Cores" value={submission.paleta_cores} />
              <FieldFull label="Observações da Paleta" value={submission.paleta_observacoes} />
              <Field label="Outro Estilo" value={submission.estilo_outro} />
            </Section>

            <Section title="Mesa dos Noivos">
              <FieldFull label="Opções" value={submission.mesa_noivos} />
              <Field label="Cartões nos Pratos" value={submission.cartoes_pratos} />
              <FieldFull label="Observações dos Cartões" value={submission.observacoes_cartoes} />
              <FieldFull label="Descrição" value={submission.descricao_mesa_noivos} />
            </Section>

            <Section title="Cenário de Palco">
              <FieldFull label="Opções" value={submission.cenario_palco} />
              <FieldFull label="Descrição" value={submission.descricao_cenario} />
              <FieldFull label="Medidas / Limitações" value={submission.medidas_espaco} />
            </Section>

            <Section title="Mesas dos Convidados">
              <FieldFull label="Centros de Mesa" value={submission.centros_mesa} />
              <FieldFull label="Tipo de Flores" value={submission.tipo_flores} />
              <Field label="Nº de Mesas" value={submission.numero_mesas} />
              <Field label="Formato das Mesas" value={submission.formato_mesas} />
              <Field label="Lugares por Mesa" value={submission.lugares_por_mesa} />
              <FieldFull label="Observações" value={submission.observacoes_mesas} />
            </Section>

            <Section title="Placa de Boas-Vindas">
              <FieldFull label="Texto Principal" value={submission.texto_principal_placa} />
              <FieldFull label="Texto Secundário" value={submission.texto_secundario_placa} />
              <FieldFull label="Estilo da Placa" value={submission.estilo_placa} />
              <FieldFull label="Notas" value={submission.notas_placa} />
            </Section>

            <Section title="Logística">
              <FieldFull label="Morada Exacta" value={submission.morada_exacta} />
              <Field label="Pessoa que Abre o Espaço" value={submission.pessoa_abre_espaco} />
              <Field label="Contacto" value={submission.contacto_pessoa_abre} />
              <FieldFull label="Acesso para Cargas" value={submission.acesso_local} />
              <FieldFull label="Notas de Acesso" value={submission.notas_acesso} />
              <FieldFull label="Observações Gerais" value={submission.observacoes_gerais} />
            </Section>

          </div>

          {/* Rodapé */}
          <div className="briefing-footer" style={{
            backgroundColor: '#FBF7EF', padding: '16px 40px',
            borderTop: '1px solid #F0E6D0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <p style={{ fontSize: '10px', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
              Planeamos cada detalhe. Criamos memórias inesquecíveis.
            </p>
            <p style={{ fontSize: '10px', color: '#6B7280', margin: 0 }}>
              Do Luxo à Mesa · {new Date().getFullYear()}
            </p>
          </div>

        </div>
      </div>
    </>
  )
}