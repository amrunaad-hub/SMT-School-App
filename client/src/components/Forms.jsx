import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api';
import { formatDateTimeDMY } from '../utils/formatDate';
import AudiencePicker from './AudiencePicker';

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text (single line)' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Paragraph (multi-line)' },
  { value: 'radio', label: 'Radio buttons (pick one)' },
  { value: 'select', label: 'Dropdown (pick one)' },
  { value: 'multiselect', label: 'Dropdown (pick multiple)' },
  { value: 'file', label: 'Attachment' },
];
// Same shape/model as Notices' audience (server/utils/noticeAudience.js):
// grade/division selection always reaches parents directly, no separate
// "target parents" toggle — Teachers and Specific Students are independent
// additive facets on top, via the shared AudiencePicker.
const AUDIENCE_DEFAULT = { allGrades: false, gradeSelections: [], grades: [], allDivisions: false, divisions: [], allTeachers: false, teacherIds: [], studentIds: [] };
const newFieldId = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Short human summary of an audience object, for the forms list.
const audienceSummary = (a) => {
  const chips = [];
  if (a.allGrades) chips.push('All Grades');
  else if (a.gradeSelections.length > 0) chips.push(`${a.gradeSelections.length} grade(s)`);
  if (a.allTeachers) chips.push('All Teachers');
  else if (a.teacherIds.length > 0) chips.push(`${a.teacherIds.length} teacher(s)`);
  if (a.studentIds.length > 0) chips.push(`${a.studentIds.length} student(s)`);
  return chips.length ? chips.join(' · ') : 'No audience selected';
};

const cardBase = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', marginTop: '12px' };
const buttonPrimary = { padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#4338ca', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' };
const buttonSecondary = { padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' };
const pillStyle = (active) => ({ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155', background: active ? '#e0e7ff' : '#f1f5f9', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer' });

const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const MIN_OPTIONS = 2;

const FieldBuilderRow = ({ field, onChange, onRemove }) => {
  const needsOptions = ['radio', 'select', 'multiselect'].includes(field.type);
  const options = field.options && field.options.length >= MIN_OPTIONS ? field.options : [...(field.options || []), '', ''].slice(0, Math.max(MIN_OPTIONS, (field.options || []).length));

  const changeType = (type) => {
    const next = { ...field, type };
    if (['radio', 'select', 'multiselect'].includes(type) && (!field.options || field.options.length < MIN_OPTIONS)) {
      next.options = Array.from({ length: MIN_OPTIONS }, (_, i) => (field.options || [])[i] || '');
    }
    onChange(next);
  };
  const changeOption = (index, value) => onChange({ ...field, options: options.map((o, i) => (i === index ? value : o)) });
  const addOption = () => onChange({ ...field, options: [...options, ''] });
  const removeOption = (index) => onChange({ ...field, options: options.filter((_, i) => i !== index) });

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '10px', background: '#fbfcfe' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Question / field label"
          style={{ ...inputStyle, flex: 2, minWidth: '180px' }}
        />
        <select value={field.type} onChange={(e) => changeType(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '160px' }}>
          {FIELD_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#334155', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={!!field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} /> Required
        </label>
        <button type="button" onClick={onRemove} style={{ border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontWeight: 700 }}>✕ Remove</button>
      </div>
      {needsOptions && (
        <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>Options (at least {MIN_OPTIONS})</span>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                value={opt}
                onChange={(e) => changeOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={options.length <= MIN_OPTIONS}
                style={{ border: '1px solid #e2e8f0', background: options.length <= MIN_OPTIONS ? '#f8fafc' : '#fef2f2', color: options.length <= MIN_OPTIONS ? '#cbd5e1' : '#b91c1c', borderRadius: '8px', padding: '8px 10px', cursor: options.length <= MIN_OPTIONS ? 'default' : 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} style={{ justifySelf: 'start', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>+ Add Option</button>
        </div>
      )}
    </div>
  );
};

const Forms = () => {
  const role = window.localStorage.getItem('smt-school-role');
  const canManage = ['admin', 'principal', 'superuser'].includes(role);

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDraft, setFormDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const [viewingResponsesFor, setViewingResponsesFor] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [fillingForm, setFillingForm] = useState(null);
  const [fillAnswers, setFillAnswers] = useState({});
  const [fillFiles, setFillFiles] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.get(canManage ? '/api/forms' : '/api/forms/mine')
      .then((data) => setForms(data.forms || []))
      .catch((err) => setError(err.message || 'Failed to load forms.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [canManage]);

  const emptyDraft = () => ({ title: '', description: '', fields: [], targetAudience: { ...AUDIENCE_DEFAULT } });

  const startCreate = () => { setEditingId(null); setFormDraft(emptyDraft()); setShowCreatePanel(true); };
  const startEdit = (form) => {
    setEditingId(form.id);
    setFormDraft({
      title: form.title, description: form.description || '', fields: form.fields,
      targetAudience: { ...AUDIENCE_DEFAULT, ...form.targetAudience },
    });
    setShowCreatePanel(true);
  };
  const addField = () => setFormDraft((d) => ({ ...d, fields: [...d.fields, { id: newFieldId(), label: '', type: 'text', required: false, options: [] }] }));
  const updateField = (index, next) => setFormDraft((d) => ({ ...d, fields: d.fields.map((f, i) => (i === index ? next : f)) }));
  const removeField = (index) => setFormDraft((d) => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }));

  const saveForm = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formDraft,
        fields: formDraft.fields.map((f) => (
          ['radio', 'select', 'multiselect'].includes(f.type)
            ? { ...f, options: f.options.map((o) => o.trim()).filter(Boolean) }
            : f
        )),
      };
      if (editingId) await api.put(`/api/forms/${editingId}`, payload);
      else await api.post('/api/forms', payload);
      setShowCreatePanel(false);
      setFormDraft(null);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (form) => {
    try {
      await api.put(`/api/forms/${form.id}`, { isActive: !form.isActive });
      load();
    } catch (err) {
      setError(err.message || 'Failed to update form.');
    }
  };

  const deleteForm = async (form) => {
    if (!window.confirm(`Delete "${form.title}" and all its responses? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/forms/${form.id}`);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete form.');
    }
  };

  const openResponses = (form) => {
    setViewingResponsesFor(form);
    setSubmissionsLoading(true);
    api.get(`/api/forms/${form.id}/submissions`)
      .then((data) => setSubmissions(data.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setSubmissionsLoading(false));
  };

  const openFillForm = (formSummary) => {
    setSubmitError('');
    api.get(`/api/forms/${formSummary.id}`)
      .then((data) => {
        setFillingForm(data);
        setFillAnswers(data.mySubmission ? data.mySubmission.answers : {});
        setFillFiles({});
      })
      .catch((err) => setError(err.message || 'Failed to load form.'));
  };

  const setAnswer = (fieldId, value) => setFillAnswers((prev) => ({ ...prev, [fieldId]: value }));

  const submitFillForm = async () => {
    if (!fillingForm) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // Phase 1: save non-file answers so a submission id exists to attach uploads to.
      const created = await api.post(`/api/forms/${fillingForm.id}/submit`, { answers: fillAnswers });
      const finalAnswers = { ...fillAnswers };

      // Phase 2: upload any newly-picked files against that submission id.
      const fileFields = fillingForm.fields.filter((f) => f.type === 'file' && fillFiles[f.id]);
      for (const field of fileFields) {
        const token = window.localStorage.getItem('smt-school-token');
        const body = new FormData();
        body.append('category', 'forms');
        body.append('ownerType', 'form_submission');
        body.append('ownerId', String(created.id));
        body.append('file', fillFiles[field.id]);
        const res = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'File upload failed.');
        finalAnswers[field.id] = data.document.id;
      }

      // Phase 3: persist the final answers (including any file doc ids) if anything changed.
      if (fileFields.length) await api.post(`/api/forms/${fillingForm.id}/submit`, { answers: finalAnswers });

      setFillingForm(null);
      setFillFiles({});
      load();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Excel/PDF/CSV export of the currently-open response review panel ----
  const buildResponseRows = () => {
    const header = ['Submitted By', 'Role', 'Submitted At', ...viewingResponsesFor.fields.map((f) => f.label)];
    const rows = submissions.map((s) => [
      s.submittedBy, s.role || '', formatDateTimeDMY(s.submittedAt),
      ...viewingResponsesFor.fields.map((f) => {
        const v = s.answers[f.id];
        if (v && typeof v === 'object' && v.isFile) return v.originalFilename || v.fileUrl || '';
        if (Array.isArray(v)) return v.join(', ');
        return v ?? '';
      }),
    ]);
    return [header, rows];
  };
  const exportBase = () => `${viewingResponsesFor.title.replace(/[^a-z0-9]+/gi, '-')}-responses`;

  const downloadCsv = () => {
    const [header, rows] = buildResponseRows();
    const esc = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    downloadBlob(`${exportBase()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  };

  const downloadPdf = () => {
    const [header, rows] = buildResponseRows();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(30, 64, 175);
    doc.text(`${viewingResponsesFor.title} — Responses`, 14, 15);
    autoTable(doc, { head: [header], body: rows, startY: 20, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] } });
    doc.save(`${exportBase()}.pdf`);
  };

  const downloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Responses');
      const [header, rows] = buildResponseRows();
      sheet.addRow(header);
      sheet.getRow(1).font = { bold: true };
      const fileColIndexes = viewingResponsesFor.fields
        .map((f, i) => (f.type === 'file' ? i + 4 : null)) // +3 for the leading columns, +1 for 1-based excel columns
        .filter(Boolean);
      submissions.forEach((s, rowIdx) => {
        const row = sheet.addRow(rows[rowIdx]);
        viewingResponsesFor.fields.forEach((f, fi) => {
          const v = s.answers[f.id];
          if (f.type === 'file' && v && v.isFile) {
            const cell = row.getCell(fi + 4);
            cell.value = { text: v.originalFilename || 'Download', hyperlink: `${window.location.origin}${v.fileUrl}` };
            cell.font = { color: { argb: 'FF1D4ED8' }, underline: true };
          }
        });
      });
      sheet.columns.forEach((col) => { col.width = 20; });
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(`${exportBase()}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    } catch (err) {
      setError('Could not generate the Excel file: ' + err.message);
    }
  };

  // -------------------------------------------------------------------------

  if (loading) return <main style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}><div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>Loading…</div></main>;

  return (
    <main style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <section style={{ borderRadius: '16px', padding: '20px 24px', border: '1px solid #c7d2fe', background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#3730a3', fontWeight: 800 }}>📝 Forms</h2>
          <p style={{ margin: '6px 0 0', color: '#4338ca', fontSize: '0.88rem' }}>
            {canManage ? 'Build a form, target grades/divisions, and collect responses.' : 'Forms sent to you by the school.'}
          </p>
        </div>
        {canManage && !showCreatePanel && <button type="button" onClick={startCreate} style={buttonPrimary}>+ New Form</button>}
      </section>

      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}

      {canManage && showCreatePanel && formDraft && (
        <div style={{ ...cardBase, marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 4px', color: '#3730a3' }}>{editingId ? 'Edit Form' : 'New Form'}</h3>
          <label style={labelStyle}>Title</label>
          <input value={formDraft.title} onChange={(e) => setFormDraft({ ...formDraft, title: e.target.value })} style={inputStyle} placeholder="e.g. Annual Sports Day — T-Shirt Size" />
          <label style={labelStyle}>Description</label>
          <textarea value={formDraft.description} onChange={(e) => setFormDraft({ ...formDraft, description: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="What is this form for?" />

          <label style={labelStyle}>Fields</label>
          {formDraft.fields.map((field, i) => (
            <FieldBuilderRow key={field.id} field={field} onChange={(next) => updateField(i, next)} onRemove={() => removeField(i)} />
          ))}
          <button type="button" onClick={addField} style={buttonSecondary}>+ Add Field</button>

          <div style={{ marginTop: '16px' }}>
            <AudiencePicker audience={formDraft.targetAudience} onChange={(targetAudience) => setFormDraft({ ...formDraft, targetAudience })} inputStyle={inputStyle} labelStyle={labelStyle} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={saveForm} disabled={saving} style={{ ...buttonPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Form'}</button>
            <button type="button" onClick={() => { setShowCreatePanel(false); setFormDraft(null); }} style={buttonSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {canManage && viewingResponsesFor && (
        <div style={{ ...cardBase, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#3730a3' }}>{viewingResponsesFor.title} — Responses ({submissions.length})</h3>
            <button type="button" onClick={() => setViewingResponsesFor(null)} style={buttonSecondary}>Close</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button type="button" onClick={downloadExcel} disabled={!submissions.length} style={{ ...buttonSecondary, background: '#ecfdf5', border: '1px solid #059669', color: '#065f46' }}>⬇ Excel</button>
            <button type="button" onClick={downloadPdf} disabled={!submissions.length} style={{ ...buttonSecondary, background: '#eff6ff', border: '1px solid #1d4ed8', color: '#1e3a8a' }}>⬇ PDF</button>
            <button type="button" onClick={downloadCsv} disabled={!submissions.length} style={{ ...buttonSecondary, background: '#f8fafc' }}>⬇ CSV</button>
          </div>
          {submissionsLoading ? <p style={{ color: '#64748b' }}>Loading…</p> : submissions.length === 0 ? (
            <p style={{ color: '#64748b' }}>No responses yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '9px' }}>Submitted By</th>
                    <th style={{ padding: '9px' }}>Role</th>
                    <th style={{ padding: '9px' }}>When</th>
                    {viewingResponsesFor.fields.map((f) => <th key={f.id} style={{ padding: '9px' }}>{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 9px', fontWeight: 700 }}>{s.submittedBy}</td>
                      <td style={{ padding: '8px 9px', color: '#64748b' }}>{s.role}</td>
                      <td style={{ padding: '8px 9px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTimeDMY(s.submittedAt)}</td>
                      {viewingResponsesFor.fields.map((f) => {
                        const v = s.answers[f.id];
                        return (
                          <td key={f.id} style={{ padding: '8px 9px' }}>
                            {v && typeof v === 'object' && v.isFile
                              ? (v.fileUrl ? <a href={v.fileUrl} target="_blank" rel="noreferrer">{v.originalFilename || 'View file'}</a> : '—')
                              : Array.isArray(v) ? v.join(', ') : (v ?? '—')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canManage && !showCreatePanel && !viewingResponsesFor && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {forms.length === 0 ? (
            <div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>No forms yet — click "+ New Form" to create one.</div>
          ) : forms.map((form) => (
            <div key={form.id} style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>
                    {form.title}
                    <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', background: form.isActive ? '#dcfce7' : '#f1f5f9', color: form.isActive ? '#166534' : '#94a3b8', fontSize: '0.68rem', fontWeight: 700, verticalAlign: 'middle' }}>{form.isActive ? 'Active' : 'Inactive'}</span>
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>{form.description}</p>
                  <p style={{ margin: '6px 0 0', color: '#4338ca', fontSize: '0.78rem', fontWeight: 700 }}>{form.responseCount} response{form.responseCount === 1 ? '' : 's'} · {audienceSummary({ ...AUDIENCE_DEFAULT, ...form.targetAudience })}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => openResponses(form)} style={buttonSecondary}>📋 Responses</button>
                  <button type="button" onClick={() => startEdit(form)} style={buttonSecondary}>✏️ Edit</button>
                  <button type="button" onClick={() => toggleActive(form)} style={buttonSecondary}>{form.isActive ? '⏸ Deactivate' : '▶ Activate'}</button>
                  <button type="button" onClick={() => deleteForm(form)} style={{ ...buttonSecondary, border: '1px solid #fca5a5', color: '#b91c1c' }}>🗑 Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!canManage && !fillingForm && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {forms.length === 0 ? (
            <div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>No forms right now.</div>
          ) : forms.map((form) => (
            <div key={form.id} style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>{form.title}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{form.description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {form.hasSubmitted && <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.76rem', fontWeight: 700 }}>✅ Submitted</span>}
                  <button type="button" onClick={() => openFillForm(form)} style={buttonPrimary}>{form.hasSubmitted ? 'Edit Response' : 'Fill Out'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!canManage && fillingForm && (
        <div style={cardBase}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#3730a3' }}>{fillingForm.title}</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{fillingForm.description}</p>
            </div>
            <button type="button" onClick={() => setFillingForm(null)} style={buttonSecondary}>Cancel</button>
          </div>

          {fillingForm.fields.map((field) => (
            <div key={field.id} style={{ marginTop: '16px' }}>
              <label style={{ ...labelStyle, marginTop: 0 }}>{field.label}{field.required && <span style={{ color: '#dc2626' }}> *</span>}</label>

              {field.type === 'text' && (
                <input value={fillAnswers[field.id] || ''} onChange={(e) => setAnswer(field.id, e.target.value)} style={inputStyle} />
              )}
              {field.type === 'number' && (
                <input type="number" value={fillAnswers[field.id] ?? ''} onChange={(e) => setAnswer(field.id, e.target.value)} style={inputStyle} />
              )}
              {field.type === 'textarea' && (
                <textarea value={fillAnswers[field.id] || ''} onChange={(e) => setAnswer(field.id, e.target.value)} style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} />
              )}
              {field.type === 'radio' && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {field.options.map((opt) => (
                    <label key={opt} style={pillStyle(fillAnswers[field.id] === opt)}>
                      <input type="radio" name={field.id} checked={fillAnswers[field.id] === opt} onChange={() => setAnswer(field.id, opt)} /> {opt}
                    </label>
                  ))}
                </div>
              )}
              {field.type === 'select' && (
                <select value={fillAnswers[field.id] || ''} onChange={(e) => setAnswer(field.id, e.target.value)} style={inputStyle}>
                  <option value="">— Select —</option>
                  {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {field.type === 'multiselect' && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {field.options.map((opt) => {
                    const selected = Array.isArray(fillAnswers[field.id]) && fillAnswers[field.id].includes(opt);
                    return (
                      <label key={opt} style={pillStyle(selected)}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current = Array.isArray(fillAnswers[field.id]) ? fillAnswers[field.id] : [];
                            setAnswer(field.id, selected ? current.filter((v) => v !== opt) : [...current, opt]);
                          }}
                        /> {opt}
                      </label>
                    );
                  })}
                </div>
              )}
              {field.type === 'file' && (
                <div>
                  <input type="file" onChange={(e) => setFillFiles((prev) => ({ ...prev, [field.id]: e.target.files[0] }))} />
                  {fillFiles[field.id] && <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#166534' }}>Selected: {fillFiles[field.id].name}</p>}
                  {!fillFiles[field.id] && fillingForm.mySubmission?.answers[field.id] && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Already attached — choose a new file to replace it.</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {submitError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '12px' }}>{submitError}</p>}
          <button type="button" onClick={submitFillForm} disabled={submitting} style={{ ...buttonPrimary, marginTop: '18px', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Submitting…' : 'Submit'}</button>
        </div>
      )}
    </main>
  );
};

export default Forms;
