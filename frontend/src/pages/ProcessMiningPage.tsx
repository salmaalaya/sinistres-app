import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { fetchProcessMining, type ProcessMiningResponse } from '../services/processMiningService';

const NODE_W = 148;
const NODE_H = 46;
const GAP = 38;

export default function ProcessMiningPage() {
  const [data, setData] = useState<ProcessMiningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProcessMining()
      .then(setData)
      .catch(() => setError('Impossible de charger le process mining.'));
  }, []);

  if (!data) {
    return (
      <Layout>
        <div className="max-w-content mx-auto px-9 py-7">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight mb-4">Process mining</h2>
          {error ? (
            <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2">{error}</p>
          ) : (
            <p className="text-text-muted font-sans">Chargement...</p>
          )}
        </div>
      </Layout>
    );
  }

  // Chaine principale : transitions consecutives entre etapes voisines dans l'ordre metier
  const chaine = data.etapes
    .slice(0, -1)
    .map((source, i) => {
      const cible = data.etapes[i + 1];
      return data.transitions.find((t) => t.source === source && t.cible === cible);
    })
    .filter((t): t is NonNullable<typeof t> => !!t);

  const nodes = data.etapes.slice(0, chaine.length + 1);
  const totalWidth = nodes.length * NODE_W + (nodes.length - 1) * GAP;
  const svgWidth = totalWidth + 40;
  const svgHeight = 150;
  const y = 50;

  const autresTransitions = data.transitions.filter((t) => !chaine.includes(t));

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Process mining</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            Parcours reconstitue par PM4Py (directly-follows graph) sur {data.nombreDossiersAnalyses.toLocaleString('fr-TN')} dossiers.
          </p>
        </div>

        <div className="bg-panel border border-hairline rounded-card p-6 mb-6 overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto">
            {chaine.map((t, i) => {
              const x1 = 20 + i * (NODE_W + GAP) + NODE_W;
              const x2 = 20 + (i + 1) * (NODE_W + GAP);
              return (
                <line
                  key={`arrow-${i}`}
                  x1={x1}
                  y1={y + NODE_H / 2}
                  x2={x2}
                  y2={y + NODE_H / 2}
                  stroke="#8C9990"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#8C9990" />
              </marker>
            </defs>
            {nodes.map((nom, i) => {
              const x = 20 + i * (NODE_W + GAP);
              const isGouletNode = chaine[i - 1]?.goulet || chaine[i]?.goulet;
              const edge = chaine[i];
              return (
                <g key={nom}>
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill="#F5F8F0"
                    stroke={isGouletNode ? '#C85A42' : '#3E8A4C33'}
                    strokeWidth={isGouletNode ? 2 : 1}
                  />
                  <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 4} textAnchor="middle" fill="#16211B" fontFamily="Inter" fontSize="12.5" fontWeight="600">
                    {nom}
                  </text>
                  {edge && (
                    <>
                      <rect
                        x={x + NODE_W + GAP / 2 - 34}
                        y={y - 22}
                        width={68}
                        height={16}
                        rx={8}
                        fill={edge.goulet ? '#C85A42' : '#FFFFFF'}
                      />
                      <text
                        x={x + NODE_W + GAP / 2}
                        y={y - 10.5}
                        textAnchor="middle"
                        fill={edge.goulet ? '#16211B' : '#8DC63F'}
                        fontFamily="JetBrains Mono"
                        fontSize="10.5"
                        fontWeight="600"
                      >
                        {edge.dureeMoyenneJours}j
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="text-[12.5px] text-text-muted font-sans mb-6">
          Goulet d&apos;etranglement identifie : <span className="text-danger font-medium">{data.etapeLaPlusLente}</span>
        </p>

        <h3 className="font-serif text-base font-semibold text-text-primary mb-3.5">Toutes les transitions observees</h3>
        <div className="bg-panel border border-hairline rounded-card overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">De</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Vers</th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Frequence</th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Duree moyenne</th>
              </tr>
            </thead>
            <tbody>
              {[...chaine, ...autresTransitions].map((t, i, arr) => (
                <tr key={`${t.source}-${t.cible}`} className={i < arr.length - 1 ? 'border-b border-hairline' : ''}>
                  <td className="px-4 py-2.5">{t.source}</td>
                  <td className="px-4 py-2.5">{t.cible}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{t.frequence.toLocaleString('fr-TN')}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${t.goulet ? 'text-danger font-semibold' : ''}`}>
                    {t.dureeMoyenneJours}j
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
