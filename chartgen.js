// 音源(モノラル Float32Array, 22050Hz)から譜面を自動生成。ブラウザ/Node共通。
(function (root) {
  const N = 1024, H = 256, LANES = 7;
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let b = n >> 1;
      for (; j & b; b >>= 1) j ^= b;
      j ^= b;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const u = i + k, v = u + len / 2;
          const tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr;
          re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti;
          [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
        }
      }
    }
  }
  function analyze(x, sr) {
    const F = Math.floor((x.length - N) / H), env = new Float32Array(F), cent = new Float32Array(F), rms = new Float32Array(F);
    const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    const re = new Float32Array(N), im = new Float32Array(N), prev = new Float32Array(N / 2);
    for (let f = 0; f < F; f++) {
      let e = 0;
      for (let i = 0; i < N; i++) { re[i] = x[f * H + i] * win[i]; im[i] = 0; e += x[f * H + i] ** 2; }
      rms[f] = Math.sqrt(e / N);
      fft(re, im);
      let flux = 0, cs = 0, ms = 0;
      for (let k = 1; k < 300; k++) {
        const m = Math.log1p(30 * Math.hypot(re[k], im[k]) / N * 4);
        const w = k < 14 ? 1.2 : k < 93 ? 1 : 0.7;
        flux += w * Math.max(0, m - prev[k]); prev[k] = m; cs += k * m; ms += m;
      }
      env[f] = flux; cent[f] = ms ? cs / ms : 0;
    }
    return { env, cent, rms, F, dt: H / sr, off: N / 2 / sr };
  }
  // difficulty: minGap(秒) が小さいほど高密度
  function generate(x, sr, minGap) {
    const { env, cent, rms, F, dt, off } = analyze(x, sr);
    const W = 8, cand = [];
    for (let i = W; i < F - W; i++) {
      let m = 0, mx = 0;
      for (let j = -W; j <= W; j++) { m += env[i + j]; mx = Math.max(mx, env[i + j]); }
      m /= 2 * W + 1;
      if (env[i] === mx && env[i] > m * 1.35 + 0.5) cand.push({ i, s: env[i] - m });
    }
    cand.sort((a, b) => b.s - a.s);
    const kept = [];
    for (const c of cand) if (kept.every(k => Math.abs(k.i - c.i) * dt >= minGap)) kept.push(c);
    kept.sort((a, b) => a.i - b.i);
    const sortedS = kept.map(k => k.s).sort((a, b) => a - b);
    const sP = p => sortedS[Math.floor(sortedS.length * p)] || 0;
    const cs = kept.map(k => cent[k.i]).sort((a, b) => a - b);
    const notes = []; let last = 3, lastT = -9;
    kept.forEach((k, idx) => {
      const t = +(k.i * dt + off - 0.012).toFixed(3);
      let lane = Math.min(LANES - 1, Math.floor(cs.indexOf(cent[k.i]) / cs.length * LANES));
      if (lane === last && t - lastT < 0.3) lane = Math.max(0, Math.min(LANES - 1, lane + (idx % 2 ? 1 : -1)));
      const nx = kept[idx + 1], gap = nx ? (nx.i - k.i) * dt : 9;
      const mid = Math.min(F - 1, k.i + Math.floor(gap / dt / 2));
      let n = { t, lane, type: 'tap' };
      if (gap >= 0.6 && gap < 4 && rms[mid] > rms[k.i] * 0.6 && idx % 2 === 0) { n.type = 'hold'; n.end = +(t + gap - 0.1).toFixed(3); }
      else if (k.s >= sP(0.93) && gap >= 0.3) n.type = 'flick';
      notes.push(n);
      if (n.type !== 'hold' && k.s >= sP(0.9)) { const l2 = LANES - 1 - lane; if (l2 !== lane) notes.push({ t, lane: l2, type: 'tap' }); }
      last = lane; lastT = t;
    });
    return notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  }
  root.ChartGen = { generate, LANES, DIFFS: { NORMAL: 0.26, HARD: 0.15, EXPERT: 0.1 } };
  if (typeof module !== 'undefined') module.exports = root.ChartGen;
})(typeof window !== 'undefined' ? window : globalThis);
