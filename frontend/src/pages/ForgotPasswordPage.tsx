import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword, verifyOtp } from '../services/authService';

type Step = 'identifiant' | 'otp' | 'newPassword' | 'success';

function computeStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Tres faible', color: '#C85A42' },
    { label: 'Faible', color: '#C85A42' },
    { label: 'Moyen', color: '#2E8A8F' },
    { label: 'Fort', color: '#3E8A4C' },
    { label: 'Tres fort', color: '#8DC63F' },
  ];
  const idx = Math.min(score, levels.length - 1);
  return { score: idx, ...levels[idx] };
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('identifiant');
  const [identifiant, setIdentifiant] = useState('');
  const [destinationMasquee, setDestinationMasquee] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = computeStrength(newPassword);

  const handleIdentifiantSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await forgotPassword(identifiant);
      setDestinationMasquee(resp.destinationMasquee);
      setStep('otp');
    } catch {
      setError("Une erreur est survenue. Reessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await verifyOtp(identifiant, code);
      setResetToken(token);
      setStep('newPassword');
    } catch {
      setError('Code invalide ou expire. Verifiez le code et reessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setStep('success');
    } catch {
      setError("Impossible de reinitialiser le mot de passe. Le lien a peut-etre expire — recommencez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-canvas px-4">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 1200px 800px at 50% -10%, #FFFFFF 0%, #F5F8F0 55%, #F4EFE3 100%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] py-6">
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-[14px] mx-auto mb-4 flex items-center justify-center font-serif font-bold text-2xl"
            style={{
              background: '#3E8A4C',
              color: '#F4FAF0',
              boxShadow: '0 0 40px rgba(141,198,63,0.35), inset 0 1px 0 rgba(255,255,255,.3)',
            }}
          >
            SB
          </div>
          <h1 className="font-serif text-[26px] font-semibold text-text-primary tracking-tight">
            Mot de passe oublie
          </h1>
          <p className="text-text-muted text-[13px] mt-1.5 font-sans">
            Mode demonstration — le code n&apos;est jamais affiche a l&apos;ecran, il est simule cote serveur.
          </p>
        </div>

        <StepIndicator step={step} />

        <div
          className="mt-6 rounded-2xl border border-panel-border px-7 pt-7 pb-6"
          style={{
            background: '#fff',
            boxShadow: '0 18px 44px rgba(18,38,26,0.07)',
          }}
        >
          {error && (
            <p className="text-[12px] text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {step === 'identifiant' && (
            <form onSubmit={handleIdentifiantSubmit}>
              <label
                className="block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted mb-1.5"
                htmlFor="identifiant"
              >
                E-mail ou telephone
              </label>
              <input
                id="identifiant"
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                required
                autoFocus
                placeholder="vous@biat.tn"
                className="input mb-5"
              />
              <SubmitButton loading={loading} label="Envoyer le code" />
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit}>
              <p className="text-[12.5px] text-text-muted font-sans mb-4">
                Un code a 6 chiffres a ete envoye
                {destinationMasquee ? <> a <span className="text-text-primary font-medium">{destinationMasquee}</span></> : null}
                . Il expire dans 10 minutes (5 tentatives maximum).
              </p>
              <label
                className="block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted mb-1.5"
                htmlFor="code"
              >
                Code de verification
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                className="input mb-5 text-center font-mono text-lg tracking-[0.4em]"
              />
              <SubmitButton loading={loading} label="Verifier le code" />
              <button
                type="button"
                onClick={() => setStep('identifiant')}
                className="w-full text-center text-[12px] text-text-muted hover:text-brand-bright mt-3 transition-colors"
              >
                Changer d&apos;identifiant
              </button>
            </form>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handlePasswordSubmit}>
              <label
                className="block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted mb-1.5"
                htmlFor="newPassword"
              >
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                className="input mb-2"
              />
              {newPassword.length > 0 && (
                <div className="mb-4">
                  <div className="h-1.5 rounded-full bg-hairline overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-colors"
                        style={{ background: i <= strength.score ? strength.color : 'transparent' }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] mt-1.5 font-sans" style={{ color: strength.color }}>
                    Robustesse : {strength.label}
                  </p>
                </div>
              )}

              <label
                className="block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted mb-1.5 mt-4"
                htmlFor="confirmPassword"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input mb-5"
              />
              <SubmitButton loading={loading} label="Reinitialiser le mot de passe" />
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-2">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(141,198,63,0.14)', border: '1px solid rgba(141,198,63,0.3)' }}
              >
                <span className="text-brand-bright text-xl">✓</span>
              </div>
              <p className="text-text-primary text-[14px] font-sans mb-5">
                Votre mot de passe a ete reinitialise avec succes.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-control font-bold text-[13.8px] text-canvas-deep transition-all"
                style={{
                  background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
                  boxShadow: '0 8px 24px rgba(141,198,63,0.28)',
                }}
              >
                Retour a la connexion
              </button>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <p className="text-center mt-5 text-[12px] text-text-faint font-sans">
            <Link to="/login" className="hover:text-brand-bright transition-colors">
              Retour a la connexion
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-control font-bold text-[13.8px] text-canvas-deep disabled:opacity-60 transition-all"
      style={{
        background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
        boxShadow: '0 8px 24px rgba(141,198,63,0.28)',
      }}
    >
      {loading ? 'Patientez...' : label}
    </button>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'identifiant', label: 'Identifiant' },
    { key: 'otp', label: 'Code' },
    { key: 'newPassword', label: 'Nouveau mot de passe' },
  ];
  const activeIndex = step === 'success' ? 3 : steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold font-mono transition-colors"
            style={{
              background: i <= activeIndex ? 'linear-gradient(135deg, #8DC63F, #3E8A4C)' : 'rgba(18,38,26,0.06)',
              color: i <= activeIndex ? '#16211B' : '#8C9990',
            }}
          >
            {i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-8 h-[2px] rounded-full"
              style={{ background: i < activeIndex ? '#3E8A4C' : 'rgba(18,38,26,0.08)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
