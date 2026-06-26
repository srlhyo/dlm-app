import { useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createEventType, updateEventType } from "../../lib/eventTypes";

// ===== Opções de tipo de campo, em português, para a irmã escolher =====
const TYPE_OPTIONS = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo (várias linhas)" },
  { value: "number", label: "Número" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Telefone" },
  { value: "date", label: "Data" },
  { value: "time", label: "Hora" },
  { value: "radio", label: "Escolha única (um botão)" },
  { value: "checkbox", label: "Escolha múltipla (vários botões)" },
];

// ===== Identificadores únicos só para React/dnd-kit saberem distinguir
// cada linha (não têm nada a ver com o "id" final gravado na BD) =====
let uidSeq = 0;
const makeUid = () => `tmp_${Date.now()}_${uidSeq++}`;

// ===== Transformar um tipo de evento já gravado (ex: Casamento) na forma
// "de edição" usada por este editor — usado quando se duplica um tipo =====
export function toEditingSteps(steps) {
  return (steps || []).map((step) => ({
    uid: makeUid(),
    title: step.title || "",
    subtitle: step.subtitle || "",
    fields: (step.fields || []).map((field) => ({
      uid: makeUid(),
      label: field.label || "",
      type: field.type || "text",
      required: !!field.required,
      placeholder: field.placeholder || "",
      options: field.options ? [...field.options] : [],
      validatePositive: field.validate === "positive",
      validateFutureDate: field.validate === "futureDate",
    })),
  }));
}

// ===== Ponto de partida para "Começar em branco" =====
export function blankEditingSteps() {
  return [{ uid: makeUid(), title: "Passo 1", subtitle: "", fields: [] }];
}

// ===== Gerar uma mensagem de erro sensata, sem a irmã ter de a escrever =====
function buildErrorMsg(validate) {
  if (validate === "phone")
    return "Introduz um número de telefone válido (ex: 912 345 678)";
  if (validate === "email") return "Introduz um endereço de email válido";
  if (validate === "futureDate") return "Esta data não pode ser no passado";
  if (validate === "positive") return "Introduz um número positivo";
  return "Este campo é obrigatório";
}

// ===== Gerar um id técnico (camelCase) a partir do label, sem colisões =====
function toCamelId(label) {
  const palavras = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (palavras.length === 0) return "campo";
  return palavras
    .map((p, i) =>
      i === 0
        ? p.toLowerCase()
        : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    )
    .join("");
}

function generateUniqueFieldId(label, idsJaUsados) {
  const base = toCamelId(label) || "campo";
  let id = base;
  let contador = 2;
  while (idsJaUsados.includes(id)) {
    id = `${base}${contador}`;
    contador++;
  }
  return id;
}

// ===== Transformar a forma "de edição" na forma final, pronta a gravar =====
// (a ordem final é sempre a ordem actual de "steps"/"fields" no estado —
// por isso reordenar por arrastar já chega aqui reflectido, sem mais nada)
function buildStepsForSave(steps) {
  const idsJaUsados = [];
  return steps.map((step, stepIndex) => ({
    id: stepIndex + 1,
    title: step.title.trim(),
    subtitle: step.subtitle.trim(),
    icon: "user", // não é usado visualmente, mantém-se só por consistência
    fields: step.fields.map((field) => {
      const id = generateUniqueFieldId(field.label, idsJaUsados);
      idsJaUsados.push(id);

      let validate;
      if (field.type === "tel") validate = "phone";
      else if (field.type === "email") validate = "email";
      else if (field.type === "number" && field.validatePositive)
        validate = "positive";
      else if (field.type === "date" && field.validateFutureDate)
        validate = "futureDate";

      const campoFinal = {
        id,
        label: field.label.trim(),
        type: field.type,
        required: field.required,
        errorMsg: buildErrorMsg(validate),
      };
      if (field.placeholder && field.placeholder.trim()) {
        campoFinal.placeholder = field.placeholder.trim();
      }
      if (validate) campoFinal.validate = validate;
      if (["radio", "checkbox"].includes(field.type)) {
        campoFinal.options = field.options
          .map((o) => o.trim())
          .filter((o) => o !== "");
      }
      return campoFinal;
    }),
  }));
}

// ===== Validar antes de gravar =====
function validar(nome, steps) {
  const problemas = [];
  if (!nome.trim()) problemas.push("Dá um nome ao tipo de evento.");
  if (steps.length === 0) problemas.push("Adiciona pelo menos um passo.");
  steps.forEach((s, i) => {
    if (!s.title.trim())
      problemas.push(`O passo ${i + 1} precisa de um título.`);
    if (s.fields.length === 0)
      problemas.push(
        `O passo "${s.title || i + 1}" precisa de pelo menos um campo.`,
      );
    s.fields.forEach((f) => {
      if (!f.label.trim())
        problemas.push(`Há um campo sem nome no passo "${s.title || i + 1}".`);
      if (["radio", "checkbox"].includes(f.type)) {
        const validas = f.options.filter((o) => o.trim() !== "");
        if (validas.length === 0) {
          problemas.push(
            `O campo "${f.label || "sem nome"}" precisa de pelo menos uma opção.`,
          );
        }
      }
    });
  });
  return problemas;
}

// ===== Estilos partilhados =====
const inputBaseStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1.5px solid var(--gold-light)",
  fontSize: "13px",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  backgroundColor: "white",
};
const labelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "var(--charcoal)",
  display: "block",
  marginBottom: "6px",
};
const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  color: "var(--charcoal)",
  marginBottom: "6px",
  cursor: "pointer",
};
const deleteIconBtnStyle = {
  fontSize: "14px",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#EF4444",
  padding: "6px",
  flexShrink: 0,
};

// ===== Pega de arrastar — usada tanto para passos como para campos =====
function DragHandle({ attributes, listeners, title }) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      title={title}
      style={{
        cursor: "grab",
        background: "none",
        border: "none",
        color: "var(--gray-mid)",
        fontSize: "18px",
        padding: "6px 4px",
        flexShrink: 0,
        touchAction: "none",
        lineHeight: 1,
        alignSelf: "flex-start",
      }}
    >
      ⠿
    </button>
  );
}

// ===== Uma opção (radio/checkbox) =====
function OptionRow({ value, onChange, onRemove, index }) {
  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Opção ${index + 1}`}
        style={{ ...inputBaseStyle, flex: 1 }}
      />
      <button onClick={onRemove} style={deleteIconBtnStyle}>
        ✕
      </button>
    </div>
  );
}

// ===== Um campo, dentro de um passo =====
function FieldRow({
  field,
  dragHandle,
  onUpdate,
  onRemove,
  onTypeChange,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
}) {
  const showPlaceholder = [
    "text",
    "email",
    "tel",
    "number",
    "textarea",
  ].includes(field.type);
  const showOptions = ["radio", "checkbox"].includes(field.type);

  return (
    <div
      style={{
        backgroundColor: "#FBF7EF",
        borderRadius: "12px",
        padding: "14px",
        border: "1px solid #F0E6D0",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "10px",
          alignItems: "center",
        }}
      >
        {dragHandle}
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Nome do campo (ex: Nome do Bebé)"
          style={{ ...inputBaseStyle, flex: "2 1 200px" }}
        />
        <select
          value={field.type}
          onChange={(e) => onTypeChange(e.target.value)}
          style={{ ...inputBaseStyle, flex: "1 1 160px" }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          style={deleteIconBtnStyle}
          title="Remover campo"
        >
          🗑
        </button>
      </div>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        Obrigatório
      </label>

      {field.type === "number" && (
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={field.validatePositive}
            onChange={(e) => onUpdate({ validatePositive: e.target.checked })}
          />
          Tem de ser um número positivo (maior que zero)
        </label>
      )}

      {field.type === "date" && (
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={field.validateFutureDate}
            onChange={(e) => onUpdate({ validateFutureDate: e.target.checked })}
          />
          Esta data não pode ser no passado (ex: data do evento)
        </label>
      )}

      {showPlaceholder && (
        <input
          type="text"
          value={field.placeholder}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Texto de exemplo, opcional (ex: Ex: João Silva)"
          style={{ ...inputBaseStyle, marginTop: "8px" }}
        />
      )}

      {showOptions && (
        <div style={{ marginTop: "10px" }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--gray-mid)",
              margin: "0 0 6px 0",
            }}
          >
            Opções
          </p>
          {field.options.map((opt, idx) => (
            <OptionRow
              key={idx}
              index={idx}
              value={opt}
              onChange={(val) => onUpdateOption(idx, val)}
              onRemove={() => onRemoveOption(idx)}
            />
          ))}
          <button
            onClick={onAddOption}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "600",
              border: "1px solid var(--gold-light)",
              color: "var(--gold)",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            + Adicionar Opção
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Envolve o FieldRow para o tornar arrastável =====
function SortableFieldRow(props) {
  const { field } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.uid });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <FieldRow
        {...props}
        dragHandle={
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            title="Arrastar para mover o campo (até para outro passo)"
          />
        }
      />
    </div>
  );
}

// ===== Um passo, com a sua lista de campos — arrastável, e também
// recebe campos arrastados de outros passos =====
function StepCard({
  step,
  stepIndex,
  onUpdateStep,
  onRemoveStep,
  onAddField,
  onUpdateField,
  onRemoveField,
  onTypeChange,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setStepNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.uid });

  // Zona onde um campo pode ser largado — mesmo que o passo esteja vazio
  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({
    id: `dropzone-${step.uid}`,
  });

  return (
    <div
      ref={setStepNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "18px",
          marginBottom: "16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          border: "1px solid var(--gold-light)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            title="Arrastar para reordenar o passo"
          />
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "var(--gold)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 6px 0",
              }}
            >
              Passo {stepIndex + 1}
            </p>
            <input
              type="text"
              value={step.title}
              onChange={(e) => onUpdateStep({ title: e.target.value })}
              placeholder="Título do passo (ex: Dados do Bebé)"
              style={{
                ...inputBaseStyle,
                fontWeight: "600",
                marginBottom: "8px",
              }}
            />
            <input
              type="text"
              value={step.subtitle}
              onChange={(e) => onUpdateStep({ subtitle: e.target.value })}
              placeholder="Subtítulo, opcional"
              style={inputBaseStyle}
            />
          </div>
          <button
            onClick={onRemoveStep}
            style={deleteIconBtnStyle}
            title="Remover passo"
          >
            🗑
          </button>
        </div>

        <SortableContext
          items={step.fields.map((f) => f.uid)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setDropZoneRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              minHeight: "12px",
              borderRadius: "10px",
              outline: isOver ? "2px dashed var(--gold)" : "none",
              outlineOffset: "4px",
              transition: "outline 0.15s",
            }}
          >
            {step.fields.map((field) => (
              <SortableFieldRow
                key={field.uid}
                field={field}
                onUpdate={(changes) => onUpdateField(field.uid, changes)}
                onRemove={() => onRemoveField(field.uid)}
                onTypeChange={(newType) => onTypeChange(field.uid, newType)}
                onUpdateOption={(idx, val) =>
                  onUpdateOption(field.uid, idx, val)
                }
                onAddOption={() => onAddOption(field.uid)}
                onRemoveOption={(idx) => onRemoveOption(field.uid, idx)}
              />
            ))}
          </div>
        </SortableContext>

        <button
          onClick={onAddField}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1.5px solid var(--gold)",
            color: "var(--gold)",
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          + Adicionar Campo
        </button>
      </div>
    </div>
  );
}

// ===== Componente principal =====
export default function EventTypeEditor({
  initialNome,
  initialSteps,
  editingId,
  isPredefinido,
  onCancel,
  onSaved,
}) {
  const [nome, setNome] = useState(initialNome || "");
  const [steps, setSteps] = useState(initialSteps || blankEditingSteps());
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState(null);

  // Um pequeno limiar de distância evita que um simples clique (ex: no
  // campo de texto) seja confundido com o início de um arrasto
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateStep = (stepUid, changes) =>
    setSteps((prev) =>
      prev.map((s) => (s.uid === stepUid ? { ...s, ...changes } : s)),
    );

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { uid: makeUid(), title: "", subtitle: "", fields: [] },
    ]);

  const removeStep = (stepUid) => {
    if (steps.length === 1) {
      alert("Tem de existir pelo menos um passo.");
      return;
    }
    if (
      !window.confirm(
        "Remover este passo? Todos os campos dele serão perdidos.",
      )
    )
      return;
    setSteps((prev) => prev.filter((s) => s.uid !== stepUid));
  };

  const updateField = (stepUid, fieldUid, changes) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.uid !== stepUid
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.uid === fieldUid ? { ...f, ...changes } : f,
              ),
            },
      ),
    );

  const addField = (stepUid) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.uid !== stepUid
          ? s
          : {
              ...s,
              fields: [
                ...s.fields,
                {
                  uid: makeUid(),
                  label: "",
                  type: "text",
                  required: true,
                  placeholder: "",
                  options: [],
                  validatePositive: false,
                  validateFutureDate: false,
                },
              ],
            },
      ),
    );

  const removeField = (stepUid, fieldUid) => {
    if (!window.confirm("Remover este campo?")) return;
    setSteps((prev) =>
      prev.map((s) =>
        s.uid !== stepUid
          ? s
          : { ...s, fields: s.fields.filter((f) => f.uid !== fieldUid) },
      ),
    );
  };

  const handleTypeChange = (stepUid, fieldUid, newType) =>
    updateField(stepUid, fieldUid, {
      type: newType,
      options: ["radio", "checkbox"].includes(newType) ? [""] : [],
    });

  const updateOption = (stepUid, fieldUid, idx, value) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.uid !== stepUid
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.uid !== fieldUid
                  ? f
                  : {
                      ...f,
                      options: f.options.map((o, i) => (i === idx ? value : o)),
                    },
              ),
            },
      ),
    );

  const addOption = (stepUid, fieldUid) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.uid !== stepUid
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.uid !== fieldUid ? f : { ...f, options: [...f.options, ""] },
              ),
            },
      ),
    );

  const removeOption = (stepUid, fieldUid, idx) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.uid !== stepUid
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.uid !== fieldUid
                  ? f
                  : { ...f, options: f.options.filter((_, i) => i !== idx) },
              ),
            },
      ),
    );

  // O que acontece ao soltar um arrasto — distingue se foi um PASSO ou
  // um CAMPO que se moveu, e se um campo mudou (ou não) de passo
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isStepDrag = steps.some((s) => s.uid === active.id);
    if (isStepDrag) {
      setSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s.uid === active.id);
        const newIndex = prev.findIndex((s) => s.uid === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    // É um campo — descobre de que passo veio, e para que passo vai
    setSteps((prev) => {
      const origemIndex = prev.findIndex((s) =>
        s.fields.some((f) => f.uid === active.id),
      );
      if (origemIndex === -1) return prev;

      // "over" pode ser outro campo, ou a zona de largar (vazia) de um passo
      let destinoIndex = prev.findIndex((s) =>
        s.fields.some((f) => f.uid === over.id),
      );
      if (destinoIndex === -1) {
        destinoIndex = prev.findIndex((s) => `dropzone-${s.uid}` === over.id);
      }
      if (destinoIndex === -1) return prev;

      const novo = prev.map((s) => ({ ...s, fields: [...s.fields] }));
      const campoIndex = novo[origemIndex].fields.findIndex(
        (f) => f.uid === active.id,
      );
      const [campo] = novo[origemIndex].fields.splice(campoIndex, 1);

      let posicaoDestino = novo[destinoIndex].fields.findIndex(
        (f) => f.uid === over.id,
      );
      if (posicaoDestino === -1) {
        posicaoDestino = novo[destinoIndex].fields.length;
      }
      novo[destinoIndex].fields.splice(posicaoDestino, 0, campo);
      return novo;
    });
  };

  const handleSave = async () => {
    const problemas = validar(nome, steps);
    if (problemas.length > 0) {
      setErro(problemas[0]);
      return;
    }
    setErro(null);
    setSaving(true);
    try {
      const finalSteps = buildStepsForSave(steps);
      const tipo = editingId
        ? await updateEventType({
            id: editingId,
            nome: nome.trim(),
            steps: finalSteps,
          })
        : await createEventType({ nome: nome.trim(), steps: finalSteps });
      onSaved(tipo);
    } catch (e) {
      console.error(e);
      setErro("Ocorreu um erro ao gravar. Tenta novamente.");
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "var(--cream)",
        display: "flex",
        justifyContent: "center",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "var(--cream)",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 20px 12px",
            borderBottom: "1px solid var(--gold-light)",
          }}
        >
          <h2
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "18px",
              color: "var(--charcoal)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            {editingId ? "Editar Tipo de Evento" : "Novo Tipo de Evento"}
          </h2>
          <button
            onClick={onCancel}
            style={{
              fontSize: "20px",
              color: "var(--gray-mid)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: "20px", flex: 1 }}>
          {isPredefinido && (
            <p
              style={{
                fontSize: "12px",
                color: "#92400E",
                backgroundColor: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: "8px",
                padding: "10px 14px",
                margin: "0 0 20px 0",
              }}
            >
              ⚠ Este é o tipo de evento predefinido — alterações aqui afectam o
              questionário do Casamento já em uso.
            </p>
          )}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Nome do Tipo de Evento *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Batizado"
              style={{ ...inputBaseStyle, fontSize: "15px" }}
            />
          </div>

          <p
            style={{
              fontSize: "11px",
              color: "var(--gray-mid)",
              margin: "0 0 14px 0",
            }}
          >
            ⠿ Arrasta pela pega para reordenar passos e campos — um campo pode
            ser arrastado para outro passo.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((s) => s.uid)}
              strategy={verticalListSortingStrategy}
            >
              {steps.map((step, stepIndex) => (
                <StepCard
                  key={step.uid}
                  step={step}
                  stepIndex={stepIndex}
                  onUpdateStep={(changes) => updateStep(step.uid, changes)}
                  onRemoveStep={() => removeStep(step.uid)}
                  onAddField={() => addField(step.uid)}
                  onUpdateField={(fieldUid, changes) =>
                    updateField(step.uid, fieldUid, changes)
                  }
                  onRemoveField={(fieldUid) => removeField(step.uid, fieldUid)}
                  onTypeChange={(fieldUid, newType) =>
                    handleTypeChange(step.uid, fieldUid, newType)
                  }
                  onUpdateOption={(fieldUid, idx, val) =>
                    updateOption(step.uid, fieldUid, idx, val)
                  }
                  onAddOption={(fieldUid) => addOption(step.uid, fieldUid)}
                  onRemoveOption={(fieldUid, idx) =>
                    removeOption(step.uid, fieldUid, idx)
                  }
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={addStep}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              border: "1.5px dashed var(--gold-light)",
              color: "var(--gold)",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            + Adicionar Passo
          </button>
        </div>

        {/* Rodapé */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "white",
            borderTop: "1px solid var(--gold-light)",
            padding: "16px 20px",
          }}
        >
          {erro && (
            <p
              style={{
                fontSize: "12px",
                color: "#EF4444",
                margin: "0 0 10px 0",
                textAlign: "right",
              }}
            >
              ⚠ {erro}
            </p>
          )}
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button
              onClick={onCancel}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                fontSize: "13px",
                border: "1.5px solid var(--gold-light)",
                color: "var(--gray-mid)",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                border: "none",
                color: "white",
                backgroundColor: saving ? "var(--gold-light)" : "var(--gold)",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "A gravar..."
                : editingId
                  ? "Guardar Alterações"
                  : "Guardar Tipo de Evento"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
