import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ClosureCelebration from '../components/ClosureCelebration';
import { createSinistre, exportSinistrePdf, fetchSinistreById, updateSinistre } from '../services/sinistreService';
import type { SinistreFormValues } from '../types';
import { triggerPdfDownload } from '../utils/downloadPdf';

interface PrefillState {
  prefill?: Partial<SinistreFormValues>;
}

const emptyForm: SinistreFormValues = {
  codeSinistre: '',
  nSinistre: '',
  dateSinistre: '',
  dateOuverture: '',
  dateClotureSinistre: '',
  natureSin: 'F',
  typeSin: 'M',
  dateRetourQuittanceSigne: '',
  dateOrdonnancement: '',
  processus: '',
};

export default function SinistreFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined && id !== 'nouveau';
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as PrefillState | null)?.prefill;

  const [values, setValues] = useState<SinistreFormValues>(
    !isEdit && prefill ? { ...emptyForm, ...prefill } : emptyForm
  );
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [originalDateCloture, setOriginalDateCloture] = useState<string>('');
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    fetchSinistreById(Number(id)).then((s) => {
      setValues({
        codeSinistre: s.codeSinistre,
        nSinistre: s.nSinistre,
        dateSinistre: s.dateSinistre,
        dateOuverture: s.dateOuverture,
        dateClotureSinistre: s.dateClotureSinistre ?? '',
        natureSin: s.natureSin,
        typeSin: s.typeSin,
        dateRetourQuittanceSigne: s.dateRetourQuittanceSigne ?? '',
        dateOrdonnancement: s.dateOrdonnancement,
        processus: s.processus,
      });
      setOriginalDateCloture(s.dateClotureSinistre ?? '');
      setLoading(false);
    });
  }, [id, isEdit]);

  const set = (field: keyof SinistreFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setValues({ ...values, [field]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      if (isEdit) {
        await updateSinistre(Number(id), values);
      } else {
        await createSinistre(values);
      }
      const justClosed = isEdit && !originalDateCloture && values.dateClotureSinistre;
      if (justClosed) {
        setShowCelebration(true);
      } else {
        navigate('/sinistres');
      }
    } catch (err: any) {
      const apiError = err?.response?.data;
      if (apiError?.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      }
      setError(apiError?.message ?? "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!isEdit) return;
    setExporting(true);
    try {
      const blob = await exportSinistrePdf(Number(id));
      triggerPdfDownload(blob, `sinistre_${values.codeSinistre}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-content mx-auto px-8 py-9 text-text-muted font-sans">Chargement...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-content mx-auto px-8 py-9 max-w-3xl">
        <div className="flex items-center justify-between mb-7">
          <h2 className="font-serif text-[26px] font-semibold text-text-primary">
            {isEdit ? 'Modifier le sinistre' : 'Nouveau sinistre'}
          </h2>
          {isEdit && (
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="text-sm font-semibold text-brand-bright border border-hairline rounded-control px-4 py-2 disabled:opacity-60 transition-colors hover:border-brand-bright"
            >
              {exporting ? 'Export en cours...' : 'Exporter en PDF'}
            </button>
          )}
        </div>

        {!isEdit && prefill && (
          <p
            className="text-[12.5px] text-text-primary rounded-control px-3 py-2 mb-4 font-sans"
            style={{ background: 'rgba(141,198,63,0.08)', border: '1px solid rgba(141,198,63,0.16)' }}
          >
            Champs pre-remplis depuis le scanner de document (document de test) — verifiez avant d&apos;enregistrer.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-panel rounded-card border border-hairline p-7 space-y-5"
        >
          {error && (
            <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Code sinistre" error={fieldErrors.codeSinistre}>
              <input
                type="number"
                required
                value={values.codeSinistre}
                onChange={set('codeSinistre')}
                className="input"
              />
            </Field>
            <Field label="N° Sinistre" error={fieldErrors.nSinistre}>
              <input type="text" required value={values.nSinistre} onChange={set('nSinistre')} className="input" />
            </Field>

            <Field label="Date sinistre" error={fieldErrors.dateSinistre}>
              <input type="date" required value={values.dateSinistre} onChange={set('dateSinistre')} className="input" />
            </Field>
            <Field label="Date ouverture" error={fieldErrors.dateOuverture}>
              <input type="date" required value={values.dateOuverture} onChange={set('dateOuverture')} className="input" />
            </Field>

            <Field label="Date cloture (optionnel)">
              <input
                type="date"
                value={values.dateClotureSinistre}
                onChange={set('dateClotureSinistre')}
                className="input"
              />
            </Field>
            <Field label="Date ordonnancement" error={fieldErrors.dateOrdonnancement}>
              <input
                type="date"
                required
                value={values.dateOrdonnancement}
                onChange={set('dateOrdonnancement')}
                className="input"
              />
            </Field>

            <Field label="Nature">
              <select value={values.natureSin} onChange={set('natureSin')} className="input">
                <option value="F">F</option>
                <option value="D">D</option>
                <option value="R">R</option>
              </select>
            </Field>
            <Field label="Type">
              <select value={values.typeSin} onChange={set('typeSin')} className="input">
                <option value="M">M</option>
                <option value="C">C</option>
              </select>
            </Field>

            <Field label="Date retour quittance (optionnel)">
              <input
                type="date"
                value={values.dateRetourQuittanceSigne}
                onChange={set('dateRetourQuittanceSigne')}
                className="input"
              />
            </Field>
            <Field label="Processus">
              <input
                type="text"
                placeholder="Processus Standard"
                value={values.processus}
                onChange={set('processus')}
                className="input"
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="text-canvas-deep text-sm font-bold px-5 py-2.5 rounded-control disabled:opacity-60 transition-all hover:brightness-105"
              style={{
                background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
                boxShadow: '0 8px 20px rgba(141,198,63,0.22)',
              }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/sinistres')}
              className="text-sm text-text-muted hover:text-brand-bright px-3 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      {showCelebration && <ClosureCelebration onDone={() => navigate('/sinistres')} />}
    </Layout>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
    </div>
  );
}
