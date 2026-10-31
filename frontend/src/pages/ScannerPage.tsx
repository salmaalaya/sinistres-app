import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { fetchSampleFile, fetchSampleList, scanDocument, type OcrResponse } from '../services/ocrService';

const NATURE_LABELS: Record<string, string> = { F: 'Facultatif', D: 'Dommage', R: 'Responsabilite' };

function toIsoDate(frDate: string | null): string {
  if (!frDate) return '';
  const [d, m, y] = frDate.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

type State = 'repos' | 'analyse' | 'resultat';

export default function ScannerPage() {
  const [state, setState] = useState<State>('repos');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [samples, setSamples] = useState<string[]>([]);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSampleList().then(setSamples).catch(() => {});
  }, []);

  const handleSampleClick = async (filename: string) => {
    setLoadingSample(filename);
    try {
      const file = await fetchSampleFile(filename);
      await handleFile(file);
    } finally {
      setLoadingSample(null);
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setState('analyse');
    setError(null);
    try {
      const res = await scanDocument(file);
      setResult(res);
      setState('resultat');
    } catch {
      setError("L'analyse a echoue. Essayez avec un autre document.");
      setState('repos');
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setState('repos');
    setResult(null);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const prefillSinistre = () => {
    if (!result) return;
    navigate('/sinistres/nouveau', {
      state: {
        prefill: {
          nSinistre: result.champs.nSinistre ?? '',
          dateSinistre: toIsoDate(result.champs.dateSinistre),
          natureSin: result.champs.natureSin ?? 'F',
        },
      },
    });
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7 max-w-[900px]">
        <div className="mb-5">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Scanner de document</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            Extraction automatique des champs cles par OCR.
          </p>
        </div>

        <div
          className="flex items-center gap-2.5 rounded-control px-4 py-3 mb-6 text-[12.5px] text-text-primary font-sans"
          style={{ background: 'rgba(141,198,63,0.08)', border: '1px solid rgba(141,198,63,0.16)' }}
        >
          <span className="text-brand-bright text-sm">i</span>
          <span>
            <strong className="font-semibold">Mode demonstration</strong> — les documents traites ici sont des
            echantillons de test generes, pas de vrais constats clients.
          </span>
        </div>

        <div className="bg-panel border border-hairline rounded-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-[38px] h-[38px] rounded-control flex items-center justify-center text-danger text-base"
              style={{ background: 'rgba(226,112,90,0.12)' }}
            >
              ⌘
            </div>
            <div>
              <h4 className="font-serif text-[15px] font-semibold text-text-primary">Constat de sinistre</h4>
              <p className="text-[11.5px] text-text-faint font-sans">
                JPG ou PNG — les champs sont pre-remplis automatiquement
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {state !== 'resultat' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="rounded-[11px] text-center py-11 px-5 cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${dragOver ? '#8DC63F' : 'rgba(141,198,63,0.16)'}`,
                background: 'rgba(18,38,26,0.03)',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {state === 'analyse' ? (
                <p className="text-[13.5px] font-medium text-brand-bright font-sans">
                  Analyse OCR en cours pour {fileName}...
                </p>
              ) : (
                <>
                  <div className="text-[26px] text-text-faint mb-3">⇧</div>
                  <p className="text-[13.5px] font-medium text-text-primary font-sans mb-1">
                    Glissez un document ici, ou cliquez pour choisir un fichier
                  </p>
                  <p className="text-[11.5px] text-text-faint font-sans">JPG, PNG — max 10 Mo</p>
                </>
              )}
            </div>
          )}

          {state === 'repos' && samples.length > 0 && (
            <div className="mt-5 pt-5 border-t border-hairline">
              <p className="text-[11.5px] text-text-faint font-sans mb-3">
                Pas de document sous la main ? Essayez un exemple genere (mode demonstration) :
              </p>
              <div className="flex flex-wrap gap-2">
                {samples.map((filename, i) => (
                  <button
                    key={filename}
                    type="button"
                    onClick={() => handleSampleClick(filename)}
                    disabled={loadingSample !== null}
                    className="text-[12px] font-mono px-3 py-1.5 rounded-control border border-hairline text-text-muted hover:text-brand-bright hover:border-brand-bright transition-colors disabled:opacity-50"
                  >
                    {loadingSample === filename ? 'Chargement...' : `Exemple ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state === 'resultat' && result && (
            <>
              <div
                className="flex items-center justify-between rounded-control px-4 py-3 mb-4"
                style={{ background: 'rgba(63,160,166,0.1)', border: '1px solid rgba(63,160,166,0.3)' }}
              >
                <span className="font-mono text-[12px] text-success">{result.nomFichier}</span>
                <span className="font-mono text-[12px] text-success font-medium">
                  Extraction reussie · {result.tauxExtraction}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldCard label="N Sinistre" value={result.champs.nSinistre} />
                <FieldCard label="Date du sinistre" value={result.champs.dateSinistre} />
                <FieldCard
                  label="Nature"
                  value={
                    result.champs.natureSin
                      ? `${result.champs.natureSin} - ${NATURE_LABELS[result.champs.natureSin] ?? ''}`
                      : null
                  }
                />
                <FieldCard
                  label="Montant reclame"
                  value={result.champs.montantReclame ? `${result.champs.montantReclame} DT` : null}
                />
                {result.champs.description && (
                  <div className="col-span-2">
                    <FieldCard label="Description sommaire" value={result.champs.description} />
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={prefillSinistre}
                  className="flex-1 text-center py-2.5 rounded-control text-[12px] font-bold text-canvas-deep"
                  style={{ background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)' }}
                >
                  Pre-remplir &quot;Nouveau sinistre&quot;
                </button>
                <button
                  onClick={reset}
                  className="flex-1 text-center py-2.5 rounded-control text-[12px] font-medium text-text-primary bg-panel-raised border border-hairline"
                >
                  Changer de fichier
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function FieldCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[8px] px-3.5 py-3" style={{ background: 'rgba(141,198,63,0.06)', border: '1px solid rgba(141,198,63,0.16)' }}>
      <div className="text-[10px] uppercase tracking-wide text-text-faint mb-1 font-sans">{label}</div>
      <div className="font-mono text-[13.5px] font-medium text-brand-bright">{value ?? '—'}</div>
    </div>
  );
}
