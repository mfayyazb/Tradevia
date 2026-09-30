import type { Result } from "./engine";
export function htmlReport(r: Omit<Result, "network">, explanation: any) {
  const esc = (v: unknown) =>
    String(v).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const entries = (data: Record<string, unknown>) =>
    Object.entries(data)
      .map(
        ([key, value]) =>
          `<tr><th>${esc(key)}</th><td>${esc(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`,
      )
      .join("");
  const values = [r.config.capital, ...r.decisions.map((d) => d.equity)],
    low = Math.min(...values) * 0.99,
    high = Math.max(...values) * 1.01;
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * 900},${190 - ((v - low) / (high - low)) * 180}`,
    )
    .join(" ");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.config.name)} · Research report</title><style>body{font:15px/1.7 system-ui,sans-serif;color:#294434;max-width:960px;padding:48px 24px;margin:auto}h1{font-size:34px;letter-spacing:-1px}h2{font-size:21px;margin-top:35px;border-bottom:1px solid #dce7df;padding-bottom:10px}small,p{color:#758879}table{width:100%;border-collapse:collapse}th,td{padding:9px 12px;text-align:left;border-bottom:1px solid #e5eee8;overflow-wrap:anywhere}th{font-weight:500;width:38%}td{color:#657d6b}svg{width:100%;height:210px;border:1px solid #e0eae3;border-radius:10px;padding:10px}pre{white-space:pre-wrap;font-size:12px;overflow-wrap:anywhere;background:#f5f8f5;padding:18px;border-radius:8px}button{background:#27734f;color:#fff;border:0;padding:12px 20px;border-radius:6px;cursor:pointer}@media print{button{display:none}body{padding:0}h2{break-after:avoid}table,svg{break-inside:avoid}}</style><small>TRADEXRL LAB / EXPERIMENT REPORT</small><h1>${esc(r.config.name)}</h1><p>${esc(r.config.algorithm)} · ${esc(r.config.asset)} · ${esc(r.source)}</p><button onclick="window.print()">Print / Save as PDF</button><h2>Independent test performance</h2><p>${esc(r.split.test.join(" — "))}. Entry, trading and final liquidation costs included.</p><svg viewBox="0 0 900 200" role="img" aria-label="Agent equity"><polyline points="${points}" fill="none" stroke="#218562" stroke-width="2.5"/></svg><table>${entries(r.metrics)}</table><h2>Configuration and reproducibility</h2><table>${entries(r.config)}${entries(r.split)}${entries({ datasetSHA256: r.dataHash })}</table><h2>Surrogate evaluation</h2><table>${entries(r.evaluation)}</table><h2>Local explanation example</h2><p>Exact single-reference Shapley values and 64-point integrated gradients for the selected decision; Q(action) for DQN or P(action) for PPO. Zero baseline. Stability diagnostics perturb the baseline five times.</p><pre>${esc(JSON.stringify(explanation, null, 2))}</pre><h2>Global policy</h2><pre>${esc(JSON.stringify(r.tree, null, 2))}</pre><h2>Limits</h2><p>Synthetic prices are demonstration data, not historical evidence. Uploaded prices are not independently verified. Daily annualization uses 252 days and zero risk-free rate. These experiments do not include market impact, broker execution or live trading. Model weights remain private. This report is for research.</p><small>Generated ${esc(new Date().toISOString())} · TradeXRL Lab MVP</small></html>`;
}
