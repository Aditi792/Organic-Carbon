// ── Load history from localStorage on startup ──
  const STORAGE_KEY = 'soc_calculator_history';

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(historyArr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyArr));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  const history = loadHistory();
  let lastResult = null;

  // ── Show saved history on page load if any exists ──
  if (history.length > 0) {
    renderHistory();
    document.getElementById('history-section').classList.add('has-items');
  }

  function setStep(n) {
    document.querySelectorAll('.card, .result-card').forEach(c => c.classList.remove('active'));
    const target = n === 3 ? document.getElementById('step-3') : document.getElementById('step-' + n);
    target.classList.add('active');

    for (let i = 1; i <= 3; i++) {
      const dot = document.getElementById('dot-' + i);
      dot.classList.remove('active', 'done');
      if (i < n) dot.classList.add('done');
      else if (i === n) dot.classList.add('active');
    }
    for (let i = 1; i <= 2; i++) {
      const line = document.getElementById('line-' + i);
      line.classList.toggle('done', i < n);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goStep1() {
    document.getElementById('err-step1').classList.remove('show');
    setStep(1);
  }

  function goStep2() {
    const name = document.getElementById('soil-name').value.trim();
    if (!name) {
      document.getElementById('err-step1').classList.add('show');
      return;
    }
    document.getElementById('err-step1').classList.remove('show');
    setStep(2);
  }

  function calculate() {
    const errEl = document.getElementById('err-step2');
    const B = parseFloat(document.getElementById('val-B').value);
    const S = parseFloat(document.getElementById('val-S').value);
    const W = parseFloat(document.getElementById('val-W').value);

    if (isNaN(B) || isNaN(S) || isNaN(W)) {
      errEl.textContent = 'Please fill in all three values (B, S, and Weight).';
      errEl.classList.add('show'); return;
    }
    if (B <= 0) {
      errEl.textContent = 'B (blank titre) must be greater than 0.';
      errEl.classList.add('show'); return;
    }
    if (S < 0 || W <= 0) {
      errEl.textContent = 'S must be ≥ 0 and Weight must be > 0.';
      errEl.classList.add('show'); return;
    }
    if (S > B) {
      errEl.textContent = 'S (sample titre) cannot be greater than B (blank titre).';
      errEl.classList.add('show'); return;
    }
    errEl.classList.remove('show');

    const oc = (10 * (B - S) / B) * 0.003 * (100 / W);
    const ocRounded = Math.round(oc * 10000) / 10000;

    lastResult = {
      name: document.getElementById('soil-name').value.trim(),
      composition: document.getElementById('soil-composition').value.trim(),
      B, S, W, oc: ocRounded,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    renderResult(lastResult);
    setStep(3);
  }

  function renderResult(r) {
    document.getElementById('result-oc').textContent = r.oc.toFixed(4);
    document.getElementById('res-B').textContent = r.B;
    document.getElementById('res-S').textContent = r.S;
    document.getElementById('res-W').textContent = r.W;

    const info = document.getElementById('result-info');
    info.innerHTML = `
      <div class="info-chip"><span>Sample</span>${r.name}</div>
      ${r.composition ? `<div class="info-chip"><span>Composition</span>${r.composition}</div>` : ''}
      <div class="info-chip"><span>Time</span>${r.time}</div>
    `;

    const interp = document.getElementById('interpretation');
    let color, bg, icon, level, msg;
    if (r.oc < 1) {
      color = '#e07070'; bg = 'rgba(180,50,50,0.12)'; icon = '⚠️';
      level = 'Very Low';
      msg = 'Organic carbon is critically low. Soil health and fertility are severely limited. Consider heavy organic matter amendments.';
    } else if (r.oc < 2) {
      color = '#e0a050'; bg = 'rgba(180,120,50,0.12)'; icon = '📉';
      level = 'Low';
      msg = 'Below optimal levels. Soil may benefit from compost or organic matter additions to improve structure and nutrient availability.';
    } else if (r.oc < 3.5) {
      color = '#8ec07c'; bg = 'rgba(74,124,89,0.12)'; icon = '✅';
      level = 'Moderate — Good';
      msg = 'Organic carbon is in a healthy range for most agricultural soils. Maintain with regular organic inputs.';
    } else if (r.oc < 6) {
      color = '#a9dc76'; bg = 'rgba(100,160,80,0.12)'; icon = '🌿';
      level = 'High';
      msg = 'Excellent organic carbon content. Indicates rich, biologically active soil with strong fertility and structure.';
    } else {
      color = '#5ec9b0'; bg = 'rgba(60,170,140,0.12)'; icon = '🌱';
      level = 'Very High';
      msg = 'Exceptionally high organic carbon — characteristic of peat soils or heavily amended plots. Verify sample is representative.';
    }

    interp.style.background = bg;
    interp.style.borderLeftColor = color;
    interp.innerHTML = `
      <div class="interp-title" style="color:${color}">${icon} ${level} (${r.oc.toFixed(2)}%)</div>
      <div class="interp-text" style="color:var(--text-mid)">${msg}</div>
    `;
  }

  function addToHistory() {
    if (!lastResult) return;

    // Prevent duplicate saves if already saved
    const alreadySaved = history.some(
      h => h.name === lastResult.name && h.time === lastResult.time
    );
    if (alreadySaved) return;

    history.unshift({ ...lastResult });
    saveHistory(history);   // ← persist to localStorage
    renderHistory();
    document.getElementById('history-section').classList.add('has-items');

    const btn = document.querySelector('[onclick="addToHistory()"]');
    btn.textContent = '✓ Saved!';
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = '+ Save to History'; btn.disabled = false; }, 2000);
  }

  function deleteHistoryItem(index) {
    history.splice(index, 1);
    saveHistory(history);
    renderHistory();
    if (history.length === 0) {
      document.getElementById('history-section').classList.remove('has-items');
    }
  }

  function clearAllHistory() {
    if (!confirm('Clear all saved results?')) return;
    history.length = 0;
    saveHistory(history);
    renderHistory();
    document.getElementById('history-section').classList.remove('has-items');
  }

  function renderHistory() {
    const list = document.getElementById('history-list');

    // Render "Clear All" button above the list
    const section = document.getElementById('history-section');
    let clearBtn = document.getElementById('clear-all-btn');
    if (!clearBtn && history.length > 0) {
      clearBtn = document.createElement('button');
      clearBtn.id = 'clear-all-btn';
      clearBtn.className = 'btn btn-secondary';
      clearBtn.style.cssText = 'font-size:12px;padding:8px 18px;margin-bottom:14px;';
      clearBtn.textContent = '🗑 Clear All';
      clearBtn.onclick = clearAllHistory;
      section.insertBefore(clearBtn, list);
    }
    if (clearBtn) clearBtn.style.display = history.length > 0 ? 'inline-flex' : 'none';

    list.innerHTML = history.map((h, i) => `
      <div class="history-item">
        <div style="flex:1;">
          <div class="hi-name">${h.name}</div>
          ${h.composition ? `<div class="hi-vals" style="margin-top:3px;font-size:11px;">${h.composition.substring(0, 60)}${h.composition.length > 60 ? '…' : ''}</div>` : ''}
          <div class="hi-vals" style="margin-top:5px;">
            B=${h.B} mL &nbsp;·&nbsp; S=${h.S} mL &nbsp;·&nbsp; W=${h.W} g
            &nbsp;·&nbsp; ${h.date ? h.date + ' ' : ''}${h.time}
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <div>
            <div class="hi-result">${h.oc.toFixed(4)}</div>
            <div class="hi-unit">% OC</div>
          </div>
          <button
            onclick="deleteHistoryItem(${i})"
            style="background:none;border:1px solid rgba(200,75,49,0.3);border-radius:6px;padding:3px 10px;font-size:11px;color:#c84b31;cursor:pointer;"
            title="Delete this entry"
          >✕ Delete</button>
        </div>
      </div>
    `).join('');
  }

  function resetAll() {
    document.getElementById('soil-name').value = '';
    document.getElementById('soil-composition').value = '';
    document.getElementById('val-B').value = '';
    document.getElementById('val-S').value = '';
    document.getElementById('val-W').value = '';
    lastResult = null;
    setStep(1);
  }
