import { useState } from 'react'
import { formSteps } from '../data/formSteps'
import FormStep from '../components/form/FormStep'
import { supabase } from '../lib/supabase'
import { validateStep } from '../lib/validation'

function Ornament({ small = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      justifyContent: 'center', margin: small ? '4px 0' : '8px 0'
    }}>
      <div style={{ height: '1px', width: small ? '18px' : '40px', backgroundColor: 'var(--gold-light)' }} />
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path d="M8 1.5 C6.2 1.5 4.5 3 4.5 5 C4.5 7 6.2 8.5 8 8.5 C9.8 8.5 11.5 7 11.5 5 C11.5 3 9.8 1.5 8 1.5Z" stroke="#C9A84C" strokeWidth="0.7" fill="none"/>
        <path d="M1 5 L4.5 5 M11.5 5 L15 5" stroke="#C9A84C" strokeWidth="0.7"/>
        <circle cx="1" cy="5" r="0.9" fill="#C9A84C"/>
        <circle cx="15" cy="5" r="0.9" fill="#C9A84C"/>
      </svg>
      <div style={{ height: '1px', width: small ? '18px' : '40px', backgroundColor: 'var(--gold-light)' }} />
    </div>
  )
}

function CoupleIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="9" r="5" stroke="#C9A84C" strokeWidth="1.2" fill="#FBF7EF"/>
      <line x1="14" y1="14" x2="14" y2="17" stroke="#C9A84C" strokeWidth="1.1"/>
      <path d="M8 18 Q8 16 14 16 Q20 16 20 18 L20 30 L8 30 Z" stroke="#C9A84C" strokeWidth="1.1" fill="#FBF7EF"/>
      <path d="M14 16 L11.5 20 L14 19" stroke="#C9A84C" strokeWidth="0.9" fill="none"/>
      <path d="M14 16 L16.5 20 L14 19" stroke="#C9A84C" strokeWidth="0.9" fill="none"/>
      <path d="M14 17 L13 21 L14 23 L15 21 Z" fill="#C9A84C" opacity="0.7"/>
      <path d="M8 30 L8 42 L12 42 L14 34 L16 42 L20 42 L20 30" stroke="#C9A84C" strokeWidth="1.1" fill="#FBF7EF"/>
      <path d="M8 42 L6 43 L12 43 L12 42" stroke="#C9A84C" strokeWidth="0.9" fill="none"/>
      <path d="M20 42 L22 43 L16 43 L16 42" stroke="#C9A84C" strokeWidth="0.9" fill="none"/>
      <circle cx="32" cy="9" r="5" stroke="#C9A84C" strokeWidth="1.2" fill="#FBF7EF"/>
      <path d="M29 6 Q32 3.5 35 6 L36 14 Q34 12 32 13 Q30 12 28 14 Z" stroke="#C9A84C" strokeWidth="0.9" fill="#FBF7EF" opacity="0.8"/>
      <line x1="32" y1="14" x2="32" y2="17" stroke="#C9A84C" strokeWidth="1.1"/>
      <path d="M27 18 Q27 16 32 16 Q37 16 37 18 L37 26 L27 26 Z" stroke="#C9A84C" strokeWidth="1.1" fill="#FBF7EF"/>
      <path d="M29 16 Q32 19 35 16" stroke="#C9A84C" strokeWidth="0.8" fill="none"/>
      <path d="M27 26 Q22 32 21 42 L43 42 Q42 32 37 26 Z" stroke="#C9A84C" strokeWidth="1.1" fill="#FBF7EF"/>
      <path d="M29 28 Q26 34 25 40" stroke="#C9A84C" strokeWidth="0.7" fill="none" opacity="0.5"/>
      <path d="M32 27 Q32 34 32 40" stroke="#C9A84C" strokeWidth="0.7" fill="none" opacity="0.4"/>
      <path d="M35 28 Q38 34 39 40" stroke="#C9A84C" strokeWidth="0.7" fill="none" opacity="0.5"/>
      <circle cx="26" cy="28" r="3" stroke="#C9A84C" strokeWidth="0.8" fill="#FBF7EF"/>
      <circle cx="24.5" cy="26.5" r="1.5" fill="#E8D5A3" opacity="0.8"/>
      <circle cx="27" cy="26" r="1.5" fill="#E8D5A3" opacity="0.8"/>
      <circle cx="25.5" cy="29" r="1.2" fill="#E8D5A3" opacity="0.7"/>
    </svg>
  )
}

// Bouquet densificado — versão melhorada com rosas maiores e cheias
function FlowerDecoration() {
  return (
    <div style={{
      position: 'fixed', top: '-10px', left: '-10px',
      width: '460px', height: '480px',
      pointerEvents: 'none', zIndex: 0,
    }}>
      <svg viewBox="0 0 460 480" width="460" height="480" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="flowerFade" cx="0%" cy="0%" r="82%">
            <stop offset="0%" stopColor="#FAFAF8" stopOpacity="0"/>
            <stop offset="42%" stopColor="#FAFAF8" stopOpacity="0"/>
            <stop offset="75%" stopColor="#FAFAF8" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#FAFAF8" stopOpacity="1"/>
          </radialGradient>
          {/* Fundo creme sólido atrás das flores */}
          <rect id="bg" width="460" height="480" fill="#FAFAF8"/>
        </defs>

        {/* Fundo creme — igual ao fundo da página */}
        <rect width="460" height="480" fill="#FAFAF8"/>

        {/* === HASTES === */}
        <path d="M 155 285 Q 128 335 98 378" stroke="#8B9E76" strokeWidth="1.6" fill="none" opacity="0.65"/>
        <path d="M 155 285 Q 178 335 192 382" stroke="#8B9E76" strokeWidth="1.6" fill="none" opacity="0.6"/>
        <path d="M 112 218 Q 85 262 62 305" stroke="#9CAF88" strokeWidth="1.4" fill="none" opacity="0.58"/>
        <path d="M 222 128 Q 212 168 205 208" stroke="#8B9E76" strokeWidth="1.3" fill="none" opacity="0.55"/>
        <path d="M 275 88 Q 268 125 260 165" stroke="#9CAF88" strokeWidth="1.2" fill="none" opacity="0.5"/>
        <path d="M 78 162 Q 56 200 40 240" stroke="#8B9E76" strokeWidth="1.2" fill="none" opacity="0.52"/>
        <path d="M 48 98 Q 36 132 28 168" stroke="#8B9E76" strokeWidth="1.1" fill="none" opacity="0.48"/>
        <path d="M 318 108 Q 312 145 305 182" stroke="#9CAF88" strokeWidth="1.1" fill="none" opacity="0.44"/>
        <path d="M 358 68 Q 355 98 348 128" stroke="#8B9E76" strokeWidth="1" fill="none" opacity="0.4"/>
        <path d="M 25 58 Q 18 85 12 115" stroke="#9CAF88" strokeWidth="1" fill="none" opacity="0.42"/>

        {/* === FOLHAS === */}
        <path d="M 155 285 Q 122 268 104 278 Q 124 282 118 295 Q 132 270 155 285Z" fill="#8B9E76" opacity="0.52"/>
        <path d="M 155 285 Q 188 270 200 280 Q 182 285 180 298 Q 165 272 155 285Z" fill="#9CAF88" opacity="0.48"/>
        <path d="M 112 218 Q 82 202 68 212 Q 84 216 80 228 Q 92 210 112 218Z" fill="#8B9E76" opacity="0.5"/>
        <path d="M 222 128 Q 198 115 188 124 Q 202 128 198 140 Q 208 122 222 128Z" fill="#9CAF88" opacity="0.46"/>
        <path d="M 275 88 Q 252 76 242 84 Q 256 88 252 100 Q 262 84 275 88Z" fill="#8B9E76" opacity="0.44"/>
        <path d="M 78 162 Q 56 148 46 156 Q 60 160 56 172 Q 66 156 78 162Z" fill="#9CAF88" opacity="0.46"/>
        <path d="M 48 98 Q 28 86 20 94 Q 34 98 30 108 Q 38 94 48 98Z" fill="#8B9E76" opacity="0.42"/>
        <path d="M 358 68 Q 340 58 332 65 Q 344 69 340 78 Q 350 65 358 68Z" fill="#9CAF88" opacity="0.38"/>

        {/* === ROSA PRINCIPAL — grande, centro === */}
        <g transform="translate(142, 212)">
          {Array.from({length:14},(_,i)=>{
            const a=i*(360/14), r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*30} cy={-Math.cos(r)*30} rx="15" ry="26"
              fill={i%2===0?"#F9F5EF":"#F2EAE0"} opacity={0.93-i*0.005}
              transform={`rotate(${a}, ${Math.sin(r)*30}, ${-Math.cos(r)*30})`}/>
          })}
          {Array.from({length:9},(_,i)=>{
            const a=i*40+20, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*17} cy={-Math.cos(r)*17} rx="12" ry="19"
              fill="#EDE5D5" opacity={0.87-i*0.005}
              transform={`rotate(${a}, ${Math.sin(r)*17}, ${-Math.cos(r)*17})`}/>
          })}
          {Array.from({length:6},(_,i)=>{
            const a=i*60+10, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*9} cy={-Math.cos(r)*9} rx="7" ry="12"
              fill="#E5D8C5" opacity={0.82}
              transform={`rotate(${a}, ${Math.sin(r)*9}, ${-Math.cos(r)*9})`}/>
          })}
          <circle cx="0" cy="0" r="14" fill="#E2CFA0" opacity="0.92"/>
          <circle cx="0" cy="0" r="8" fill="#D4BA7A" opacity="0.88"/>
          <circle cx="0" cy="0" r="4" fill="#C9A84C" opacity="0.75"/>
        </g>

        {/* === ROSA GRANDE 2 — topo direita === */}
        <g transform="translate(252, 112)">
          {Array.from({length:12},(_,i)=>{
            const a=i*30, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*24} cy={-Math.cos(r)*24} rx="13" ry="22"
              fill={i%2===0?"#F9F5EF":"#F1E9DF"} opacity={0.91-i*0.005}
              transform={`rotate(${a}, ${Math.sin(r)*24}, ${-Math.cos(r)*24})`}/>
          })}
          {Array.from({length:7},(_,i)=>{
            const a=i*(360/7)+25, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*13} cy={-Math.cos(r)*13} rx="9" ry="15"
              fill="#EAE0CC" opacity={0.84}
              transform={`rotate(${a}, ${Math.sin(r)*13}, ${-Math.cos(r)*13})`}/>
          })}
          <circle cx="0" cy="0" r="12" fill="#E2CFA0" opacity="0.9"/>
          <circle cx="0" cy="0" r="6" fill="#C9A84C" opacity="0.68"/>
        </g>

        {/* === ROSA MÉDIA — esquerda === */}
        <g transform="translate(70, 148)">
          {Array.from({length:10},(_,i)=>{
            const a=i*36, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*18} cy={-Math.cos(r)*18} rx="11" ry="18"
              fill={i%2===0?"#F9F5EF":"#F1E9DF"} opacity={0.88-i*0.005}
              transform={`rotate(${a}, ${Math.sin(r)*18}, ${-Math.cos(r)*18})`}/>
          })}
          {Array.from({length:6},(_,i)=>{
            const a=i*60+18, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*9} cy={-Math.cos(r)*9} rx="7" ry="11"
              fill="#EAE0CC" opacity={0.8}
              transform={`rotate(${a}, ${Math.sin(r)*9}, ${-Math.cos(r)*9})`}/>
          })}
          <circle cx="0" cy="0" r="10" fill="#E2CFA0" opacity="0.88"/>
          <circle cx="0" cy="0" r="5" fill="#C9A84C" opacity="0.62"/>
        </g>

        {/* === ROSA PEQUENA — topo esquerda === */}
        <g transform="translate(46, 74)">
          {Array.from({length:9},(_,i)=>{
            const a=i*40, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*14} cy={-Math.cos(r)*14} rx="9" ry="14"
              fill={i%2===0?"#F9F5EF":"#F1E9DF"} opacity={0.86}
              transform={`rotate(${a}, ${Math.sin(r)*14}, ${-Math.cos(r)*14})`}/>
          })}
          <circle cx="0" cy="0" r="8" fill="#E2CFA0" opacity="0.86"/>
          <circle cx="0" cy="0" r="4" fill="#C9A84C" opacity="0.6"/>
        </g>

        {/* === ROSA EXTRA 1 === */}
        <g transform="translate(192, 68)">
          {Array.from({length:8},(_,i)=>{
            const a=i*45, r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*12} cy={-Math.cos(r)*12} rx="8" ry="13"
              fill={i%2===0?"#F9F5EF":"#F1E9DF"} opacity={0.84}
              transform={`rotate(${a}, ${Math.sin(r)*12}, ${-Math.cos(r)*12})`}/>
          })}
          <circle cx="0" cy="0" r="7" fill="#E2CFA0" opacity="0.85"/>
          <circle cx="0" cy="0" r="3" fill="#C9A84C" opacity="0.6"/>
        </g>

        {/* === ROSA EXTRA 2 — preenche zona vazia centro-direita === */}
        <g transform="translate(348, 148)">
          {Array.from({length:7},(_,i)=>{
            const a=i*(360/7), r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*11} cy={-Math.cos(r)*11} rx="7" ry="12"
              fill={i%2===0?"#F9F5EF":"#F1E9DF"} opacity={0.82}
              transform={`rotate(${a}, ${Math.sin(r)*11}, ${-Math.cos(r)*11})`}/>
          })}
          <circle cx="0" cy="0" r="6" fill="#E2CFA0" opacity="0.84"/>
          <circle cx="0" cy="0" r="3" fill="#C9A84C" opacity="0.55"/>
        </g>

        {/* === ROSA EXTRA 3 — zona inferior esquerda === */}
        <g transform="translate(26, 185)">
          {Array.from({length:7},(_,i)=>{
            const a=i*(360/7), r=a*Math.PI/180
            return <ellipse key={i} cx={Math.sin(r)*10} cy={-Math.cos(r)*10} rx="6" ry="11"
              fill={i%2===0?"#F9F5EF":"#F1E9DF"} opacity={0.8}
              transform={`rotate(${a}, ${Math.sin(r)*10}, ${-Math.cos(r)*10})`}/>
          })}
          <circle cx="0" cy="0" r="5" fill="#E2CFA0" opacity="0.82"/>
        </g>

        {/* === BOTÕES FLORAIS — vários tamanhos e posições === */}
        {[
          [328,152,16],[38,205,14],[308,192,12],[162,55,13],
          [95,55,11],[368,82,10],[18,138,12],[295,62,10],
          [415,108,9],[132,245,12],[215,248,10]
        ].map(([x,y,r],idx)=>(
          <g key={idx} transform={`translate(${x},${y})`}>
            {Array.from({length:6},(_,i)=>{
              const a=i*60, rad=a*Math.PI/180
              return <ellipse key={i}
                cx={Math.sin(rad)*r*0.58} cy={-Math.cos(rad)*r*0.58}
                rx={r*0.44} ry={r*0.68}
                fill="#F1E9DF" opacity={0.78}
                transform={`rotate(${a}, ${Math.sin(rad)*r*0.58}, ${-Math.cos(rad)*r*0.58})`}/>
            })}
            <circle cx="0" cy="0" r={r*0.38} fill="#E2CFA0" opacity="0.84"/>
          </g>
        ))}

        {/* === GYPSOPHILA — distribuída por todo o bouquet === */}
        {[
          [192,178,4.5],[215,150,4.2],[178,140,4],[242,95,4.5],
          [285,68,4],[302,100,4.2],[165,100,4],[125,90,3.8],
          [98,115,4],[352,128,3.8],[368,92,3.5],[160,62,3.8],
          [232,55,3.5],[90,48,3.8],[145,162,4],[340,162,3.5],
          [375,152,3.2],[205,195,3.8],[108,192,4],[56,132,3.8],
          [278,145,4],[318,72,3.5],[255,178,3.8],[130,126,3.5],
          [58,178,3.8],[342,112,3.2],[120,168,3.5],[275,112,3.8],
          [208,115,3.5],[150,112,4],[385,68,3.2],[22,112,3.5],
          [395,128,3],[245,145,3.8],[175,222,3.5],[265,225,3.2],
          [112,238,3.5],[82,225,3.8],[355,195,3.2],[398,88,3]
        ].map(([x,y,r],i)=>(
          <g key={i}>
            {Array.from({length:5},(_,j)=>{
              const a=j*72, rad=a*Math.PI/180
              return <ellipse key={j}
                cx={x+Math.sin(rad)*(r+2.2)} cy={y-Math.cos(rad)*(r+2.2)}
                rx={r*0.55} ry={r*0.78}
                fill="white" opacity="0.93"
                transform={`rotate(${a}, ${x+Math.sin(rad)*(r+2.2)}, ${y-Math.cos(rad)*(r+2.2)})`}/>
            })}
            <circle cx={x} cy={y} r={r*0.48} fill="#F5ECD7" opacity="0.96"/>
          </g>
        ))}

        {/* Miolos dourados */}
        {[
          [192,178],[215,150],[178,140],[242,95],[285,68],
          [302,100],[165,100],[125,90],[98,115],[160,62],
          [232,55],[145,162],[205,195],[108,192],[278,145],
          [130,126],[150,112],[208,115],[275,112],[56,132],
          [245,145],[175,222],[265,225],[112,238],[82,225]
        ].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="1.9" fill="#DEC98A" opacity="0.88"/>
        ))}

        {/* Fade suave nas bordas */}
        <rect width="460" height="480" fill="url(#flowerFade)"/>
      </svg>
    </div>
  )
}

function ProgressStepper({ currentStep, steps }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center',
      marginBottom: '24px',
      padding: '0 8px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {steps.map((step, index) => {
        const stepNum = index + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        const isLast = index === steps.length - 1
        return (
          <div key={step.id} style={{
            display: 'flex', alignItems: 'flex-start',
            flex: isLast ? '0 0 auto' : 1,
            minWidth: 0
          }}>
            {/* Círculo + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '600',
                transition: 'all 0.35s ease',
                backgroundColor: isCompleted || isActive ? 'var(--gold)' : 'white',
                color: isCompleted || isActive ? 'white' : 'var(--gold-light)',
                border: `2px solid ${isCompleted || isActive ? 'var(--gold)' : 'var(--gold-light)'}`,
                boxShadow: isActive ? '0 0 0 4px rgba(201,168,76,0.15)' : 'none',
                flexShrink: 0
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <p style={{
                fontSize: '8px', textAlign: 'center',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                color: isActive ? 'var(--gold)' : isCompleted ? 'var(--gold)' : 'var(--gold-light)',
                fontWeight: isActive ? '700' : '400',
                lineHeight: '1.3',
                width: '52px',
                margin: '4px 0 0',
                wordBreak: 'break-word'
              }}>
                {step.title}
              </p>
            </div>
            {/* Linha conectora — só entre passos, não após o último */}
            {!isLast && (
              <div style={{
                height: '1.5px',
                flex: 1,
                marginTop: '14px',
                marginLeft: '4px',
                marginRight: '4px',
                backgroundColor: stepNum < currentStep ? 'var(--gold)' : 'var(--gold-light)',
                transition: 'background-color 0.35s ease',
                minWidth: '8px'
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function FormPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [shakeBtn, setShakeBtn] = useState(false)

  const totalSteps = formSteps.length
  const step = formSteps[currentStep - 1]
  const percentage = Math.round((currentStep / totalSteps) * 100)

  const handleChange = (fieldId, value) => setFormData(prev => ({ ...prev, [fieldId]: value }))
  const handleClearError = (fieldId) => setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n })
  const triggerShake = () => { setShakeBtn(true); setTimeout(() => setShakeBtn(false), 500) }

  const handleNext = () => {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) { setErrors(stepErrors); triggerShake(); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setErrors({}); setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setErrors({})
    if (currentStep > 1) setCurrentStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) { setErrors(stepErrors); triggerShake(); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSubmitting(true); setSubmitError(null)
    const payload = {
      nome_noivo: formData.nomeNoivo, nome_noiva: formData.nomeNoiva,
      contacto_principal: formData.contactoPrincipal, email: formData.email,
      morada: formData.morada, data_evento: formData.dataEvento || null,
      local_evento: formData.localEvento,
      numero_convidados: formData.numeroConvidados ? parseInt(formData.numeroConvidados) : null,
      hora_inicio: formData.horaInicio || null, hora_termino: formData.horaTermino || null,
      hora_montagem: formData.horaMontagem || null, hora_limite_montagem: formData.horaLimiteMontagem || null,
      hora_recolha: formData.horaRecolha || null, recolha_dia_seguinte: formData.recolhaDiaSeguinte,
      nome_responsavel: formData.nomeResponsavel, contacto_responsavel: formData.contactoResponsavel,
      relacao_responsavel: formData.relacaoResponsavel, estilo_evento: formData.estiloEvento || [],
      estilo_outro: formData.estiloOutro, paleta_cores: formData.paletaCores || [],
      paleta_observacoes: formData.paletaObservacoes, mesa_noivos: formData.mesaNoivos || [],
      cartoes_pratos: formData.cartoesPratos, observacoes_cartoes: formData.observacoesCartoes,
      descricao_mesa_noivos: formData.descricaoMesaNoivos, cenario_palco: formData.cenarioPalco || [],
      descricao_cenario: formData.descricaoCenario, medidas_espaco: formData.medidasEspaco,
      centros_mesa: formData.centrosMesa || [], tipo_flores: formData.tipoFlores || [],
      numero_mesas: formData.numeroMesas ? parseInt(formData.numeroMesas) : null,
      formato_mesas: formData.formatoMesas,
      lugares_por_mesa: formData.lugaresporMesa ? parseInt(formData.lugaresporMesa) : null,
      observacoes_mesas: formData.observacoesMesas, texto_principal_placa: formData.textoPrincipalPlaca,
      texto_secundario_placa: formData.textoSecundarioPlaca, estilo_placa: formData.estiloPlaca || [],
      notas_placa: formData.notasPlaca, morada_exacta: formData.moradaExacta,
      pessoa_abre_espaco: formData.pessoaAbreEspaco, contacto_pessoa_abre: formData.contactoPessoaAbre,
      acesso_local: formData.acessoLocal || [], notas_acesso: formData.notasAcesso,
      observacoes_gerais: formData.observacoesGerais,
    }
    const { error } = await supabase.from('submissions').insert([payload])
    if (error) setSubmitError('Ocorreu um erro ao submeter. Por favor tenta novamente.')
    else setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <FlowerDecoration />
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '52px 44px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 8px 48px rgba(0,0,0,0.08)', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>💍</div>
          <h2 style={{ fontSize: '24px', color: 'var(--gold)', margin: '0 0 4px 0', fontFamily: 'Playfair Display, serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Obrigado!</h2>
          <Ornament />
          <p style={{ fontSize: '14px', color: 'var(--gray-mid)', lineHeight: '1.8', margin: '12px 0 20px' }}>
            O vosso questionário foi submetido com sucesso.<br />Entraremos em contacto brevemente.
          </p>
          <p style={{ fontSize: '10px', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>
            Planeamos cada detalhe. Criamos memórias inesquecíveis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        .shake{animation:shake 0.4s ease}
      `}</style>

      <FlowerDecoration />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 16px 64px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>

          {/* Cabeçalho */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{
              fontSize: 'clamp(24px, 6.5vw, 44px)',
              color: 'var(--gold)', fontFamily: 'Playfair Display, serif',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              margin: '0 0 6px 0', lineHeight: 1.1
            }}>
              Do Luxo à Mesa
            </h1>

            {/* "by Luxury Events" — dourado como no template */}
            <p style={{
              fontSize: '11px', color: 'var(--gold)',
              textTransform: 'uppercase', letterSpacing: '0.28em',
              margin: '0 0 20px 0', fontWeight: '400'
            }}>
              by Luxury Events
            </p>

            {/* "Questionário dos Noivos" com linhas laterais — maior espaço */}
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '12px', justifyContent: 'center',
              marginBottom: '6px'
            }}>
              <div style={{ height: '1px', flex: 1, maxWidth: '70px', backgroundColor: 'var(--gold-light)' }} />
              <p style={{
                fontSize: '12px', color: 'var(--charcoal)',
                textTransform: 'uppercase', letterSpacing: '0.2em',
                margin: 0, fontWeight: '500', whiteSpace: 'nowrap'
              }}>
                Questionário dos Noivos
              </p>
              <div style={{ height: '1px', flex: 1, maxWidth: '70px', backgroundColor: 'var(--gold-light)' }} />
            </div>
            <Ornament small />
          </div>

          {/* Stepper */}
          <ProgressStepper currentStep={currentStep} steps={formSteps} />

          {/* Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.08)' }}>

            {/* Barra de progresso */}
            <div style={{ padding: '14px 28px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Passo {currentStep} de {totalSteps}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '600' }}>
                  {percentage}% Concluído
                </span>
              </div>
              <div style={{ height: '5px', borderRadius: '999px', backgroundColor: '#F5ECD7', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '999px', backgroundColor: 'var(--gold)', width: `${percentage}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Corpo */}
            <div style={{ padding: '20px 28px 24px' }}>

              {/* Cabeçalho do passo — ornamento entre título e subtítulo */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: '#FBF7EF', border: '1.5px solid var(--gold-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <CoupleIcon />
                </div>
                <div style={{ flex: 1, paddingTop: '2px' }}>
                  <h2 style={{
                    fontSize: '16px', color: 'var(--charcoal)', margin: '0 0 4px 0',
                    fontFamily: 'Playfair Display, serif',
                    textTransform: 'uppercase', letterSpacing: '0.1em'
                  }}>
                    {step.title}
                  </h2>
                  {/* Ornamento — exactamente entre título e subtítulo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 5px 50px' }}>
                    <div style={{ height: '1px', width: '20px', backgroundColor: 'var(--gold-light)' }} />
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path d="M6 1 C4.8 1 3.5 2.2 3.5 4 C3.5 5.8 4.8 7 6 7 C7.2 7 8.5 5.8 8.5 4 C8.5 2.2 7.2 1 6 1Z" stroke="#C9A84C" strokeWidth="0.6" fill="none"/>
                      <path d="M0.5 4 L3.5 4 M8.5 4 L11.5 4" stroke="#C9A84C" strokeWidth="0.6"/>
                      <circle cx="0.5" cy="4" r="0.7" fill="#C9A84C"/>
                      <circle cx="11.5" cy="4" r="0.7" fill="#C9A84C"/>
                    </svg>
                    <div style={{ height: '1px', width: '20px', backgroundColor: 'var(--gold-light)' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray-mid)', margin: 0, lineHeight: '1.4' }}>
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Campos */}
              <FormStep step={step} formData={formData} onChange={handleChange} errors={errors} onClearError={handleClearError} />

              {submitError && (
                <p style={{ fontSize: '13px', color: '#EF4444', textAlign: 'center', marginTop: '16px' }}>{submitError}</p>
              )}
            </div>

            {/* Footer creme */}
            <div style={{
              backgroundColor: '#FBF7EF', borderTop: '1px solid #F0E6D0',
              padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <button onClick={handleBack} disabled={currentStep === 1} style={{
                padding: '10px 24px', borderRadius: '999px', fontSize: '11px', fontWeight: '600',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                border: `1.5px solid ${currentStep === 1 ? 'var(--gold-light)' : 'var(--gold)'}`,
                color: currentStep === 1 ? 'var(--gold-light)' : 'var(--gold)',
                backgroundColor: 'transparent', cursor: currentStep === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
              }}>← Voltar</button>

              {currentStep < totalSteps ? (
                <button onClick={handleNext} className={shakeBtn ? 'shake' : ''} style={{
                  padding: '10px 32px', borderRadius: '999px', fontSize: '11px', fontWeight: '600',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  backgroundColor: 'var(--gold)', color: 'white', border: 'none',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(201,168,76,0.4)'
                }}>Continuar →</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className={shakeBtn ? 'shake' : ''} style={{
                  padding: '10px 32px', borderRadius: '999px', fontSize: '11px', fontWeight: '600',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  backgroundColor: submitting ? 'var(--gold-light)' : 'var(--gold)',
                  color: 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(201,168,76,0.4)'
                }}>{submitting ? 'A enviar...' : 'Submeter ✓'}</button>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ marginTop: '20px' }}>
            <Ornament />
            <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.18em', margin: '4px 0 0' }}>
              Planeamos cada detalhe. Criamos memórias inesquecíveis.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}