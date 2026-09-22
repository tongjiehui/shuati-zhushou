// =====================
// 模拟考试模式
// =====================
import * as store from '../storage.js?v=20260922b';
import { $, setView, escapeHtml, toast, confirm, fmtTimer } from '../ui.js?v=20260922b';
import { TYPE_LABELS, TYPE_ICONS, checkAnswer, formatAnswer, formatUserAnswer, renderFillInputs, collectFillAnswers, originalNoLabel } from '../questionTypes.js?v=20260922b';

export function renderExam(hash) {
  const sub = hash.replace(/^#\/exam\/?/, '');
  const [bankId, mode] = sub.split('/');
  if (mode === 'run') return renderRun(bankId);
  return renderConfig(bankId);
}

// =====================
// 配置
// =====================

function renderConfig(bankId) {
  // C3 题库排最前并作为默认选中
  const banks = store.listBanks().slice().sort((a, b) =>
    (b.id === 'bank-c3-all') - (a.id === 'bank-c3-all')
  );
  if (banks.length === 0) {
    setView(`<div class="empty"><div class="ico">📚</div><p>还没有题库</p><button class="btn btn-primary mt-3" onclick="location.hash='#/bank'">去创建</button></div>`);
    return;
  }
  const curBank = bankId ? banks.find(b => b.id === bankId) : banks[0];
  if (!curBank) { location.hash = '#/exam'; return; }

  const total = curBank.questions?.length || 0;
  const isC3 = curBank.id === 'bank-c3-all';

  setView(`
    <div class="card">
      <label class="field-label">选择题库</label>
      <select id="bankSelect">
        ${banks.map(b => `<option value="${b.id}" ${b.id === curBank.id ? 'selected' : ''}>${escapeHtml(b.name)} (${b.questions?.length || 0})</option>`).join('')}
      </select>
    </div>

    ${isC3 ? renderC3Config(curBank) : renderNormalConfig(total)}

    <button class="btn btn-primary btn-block" id="startBtn">开始考试</button>

    <div class="card mt-3 text-sm text-muted" style="line-height:1.7;">
      💡 考试模式下不可查看答案,需交卷后统一评分;时间到将自动交卷。
    </div>
  `);

  $('#bankSelect').addEventListener('change', (e) => {
    location.hash = '#/exam/' + e.target.value;
  });

  // C3 表单联动:实时显示总题数 / 总分
  if (isC3) {
    const refresh = () => {
      const s = parseInt($('#c3Single').value) || 0;
      const m = parseInt($('#c3Multiple').value) || 0;
      const j = parseInt($('#c3Judge').value) || 0;
      const total = s + m + j;
      const score = s * 1 + m * 2 + j * 1;
      $('#c3Total').textContent = total;
      $('#c3Score').textContent = score;
    };
    ['#c3Single', '#c3Multiple', '#c3Judge'].forEach(sel => $(sel).addEventListener('input', refresh));
    refresh();
  }

  $('#startBtn').addEventListener('click', async () => {
    let questions, points, duration;

    if (isC3) {
      const single = parseInt($('#c3Single').value);
      const multiple = parseInt($('#c3Multiple').value);
      const judge = parseInt($('#c3Judge').value);
      duration = parseInt($('#duration').value);

      const singleAvail = curBank.questions.filter(q => q.type === 'single').length;
      const multipleAvail = curBank.questions.filter(q => q.type === 'multiple').length;
      const judgeAvail = curBank.questions.filter(q => q.type === 'judge').length;

      if (single < 0 || single > singleAvail) { toast(`单选题 0-${singleAvail}`, 1500); return; }
      if (multiple < 0 || multiple > multipleAvail) { toast(`多选题 0-${multipleAvail}`, 1500); return; }
      if (judge < 0 || judge > judgeAvail) { toast(`判断题 0-${judgeAvail}`, 1500); return; }
      if (single + multiple + judge === 0) { toast('至少需要 1 道题', 1500); return; }
      if (duration < 1 || duration > 240) { toast('时长需在 1-240 分钟', 1500); return; }

      const pool = {
        single: curBank.questions.filter(q => q.type === 'single').slice().sort(() => Math.random() - 0.5).slice(0, single),
        multiple: curBank.questions.filter(q => q.type === 'multiple').slice().sort(() => Math.random() - 0.5).slice(0, multiple),
        judge: curBank.questions.filter(q => q.type === 'judge').slice().sort(() => Math.random() - 0.5).slice(0, judge)
      };
      questions = [...pool.single, ...pool.multiple, ...pool.judge];
      points = [
        ...new Array(pool.single.length).fill(1),
        ...new Array(pool.multiple.length).fill(2),
        ...new Array(pool.judge.length).fill(1)
      ];
    } else {
      const count = parseInt($('#count').value);
      duration = parseInt($('#duration').value);
      const orderMode = $('#orderMode').value;

      if (count < 1 || count > total) { toast(`题目数量需在 1-${total}`, 1500); return; }
      if (duration < 1 || duration > 240) { toast('时长需在 1-240 分钟', 1500); return; }

      questions = curBank.questions.slice();
      if (orderMode === 'random') questions.sort(() => Math.random() - 0.5);
      questions = questions.slice(0, count);
      points = new Array(questions.length).fill(1);
    }

    const totalScore = points.reduce((a, b) => a + b, 0);
    const ok = await confirm({
      title: '开始考试?',
      message: `本次考试共 ${questions.length} 题,总分 ${totalScore} 分,时长 ${duration} 分钟,开始后计时不可暂停。`,
      okText: '开始'
    });
    if (!ok) return;

    const sess = {
      bankId: curBank.id,
      bankName: curBank.name,
      questions,
      points,
      totalScore,
      answers: new Array(questions.length).fill(null),
      results: new Array(questions.length).fill(null),
      index: 0,
      duration: duration * 60,
      startTime: Date.now(),
      mode: 'exam'
    };
    sessionStorage.setItem('exam-session', JSON.stringify(sess));
    location.hash = '#/exam/' + curBank.id + '/run';
  });
}

function renderNormalConfig(total) {
  return `
    <div class="card">
      <div class="fw-600 mb-2">考试设置</div>
      <div class="form-row">
        <label class="field-label">题目数量 (题库共 ${total} 题)</label>
        <input type="number" id="count" min="1" max="${total}" value="${Math.min(100, total)}" />
      </div>
      <div class="form-row">
        <label class="field-label">考试时长 (分钟)</label>
        <input type="number" id="duration" min="1" max="240" value="45" />
      </div>
      <div class="form-row">
        <label class="field-label">组卷方式</label>
        <select id="orderMode">
          <option value="random" selected>随机抽题</option>
          <option value="sequential">顺序出题</option>
        </select>
      </div>
    </div>
  `;
}

function renderC3Config(curBank) {
  const singleAvail = curBank.questions.filter(q => q.type === 'single').length;
  const multipleAvail = curBank.questions.filter(q => q.type === 'multiple').length;
  const judgeAvail = curBank.questions.filter(q => q.type === 'judge').length;
  return `
    <div class="card">
      <div class="fw-600 mb-2">C3 安全考核 - 考试设置</div>
      <div class="form-row">
        <label class="field-label">单选题 · 1 分/题 (${singleAvail} 题可选)</label>
        <input type="number" id="c3Single" min="0" max="${singleAvail}" value="50" />
      </div>
      <div class="form-row">
        <label class="field-label">多选题 · 2 分/题 (${multipleAvail} 题可选)</label>
        <input type="number" id="c3Multiple" min="0" max="${multipleAvail}" value="10" />
      </div>
      <div class="form-row">
        <label class="field-label">判断题 · 1 分/题 (${judgeAvail} 题可选)</label>
        <input type="number" id="c3Judge" min="0" max="${judgeAvail}" value="18" />
      </div>
      <div class="form-row">
        <label class="field-label">考试时长 (分钟)</label>
        <input type="number" id="duration" min="1" max="240" value="90" />
      </div>
      <div class="mt-2 text-sm" style="color:var(--color-primary);">
        合计 <span id="c3Total" class="fw-700">78</span> 道题 · 总分 <span id="c3Score" class="fw-700">88</span> 分 · 时长 90 分钟
      </div>
    </div>
  `;
}

// =====================
// 答题
// =====================

function renderRun(bankId) {
  const sessRaw = sessionStorage.getItem('exam-session');
  if (!sessRaw) { location.hash = '#/exam/' + (bankId || ''); return; }
  const sess = JSON.parse(sessRaw);

  const elapsed = Math.floor((Date.now() - sess.startTime) / 1000);
  const remain = sess.duration - elapsed;

  if (remain <= 0) {
    finishExam(sess);
    return;
  }

  const q = sess.questions[sess.index];
  const total = sess.questions.length;
  const settings = store.getSettings();
  const answered = sess.answers.filter(a => !isEmptyVal(q, a)).length;

  setView(`
    <div class="exam-timer ${remain < 60 ? 'warn' : ''}">
      <span>⏱ 剩余 ${fmtTimer(remain)}</span>
      <span>已答 ${answered}/${total}</span>
    </div>

    <div class="q-card">
      <div class="q-head">
        <div class="q-type">第 ${sess.index + 1} / ${total} 题 · ${TYPE_ICONS[q.type]} ${TYPE_LABELS[q.type]}${originalNoLabel(q) ? ' · ' + originalNoLabel(q) : ''}</div>
        <button class="q-fav-btn ${store.isFavorite(q.id) ? 'active' : ''}" id="favBtn">${store.isFavorite(q.id) ? '⭐ 已收藏' : '☆ 收藏'}</button>
      </div>
      <div class="q-stem" id="qStem">${escapeHtml(q.stem)}</div>
      <div id="answerArea"></div>
    </div>

    <div class="answer-sheet">
      ${sess.questions.map((_, i) => {
        const cls = [];
        if (i === sess.index) cls.push('current');
        if (!isEmptyVal(sess.questions[i], sess.answers[i])) cls.push('answered');
        return `<div class="answer-cell ${cls.join(' ')}" data-jump="${i}">${i + 1}</div>`;
      }).join('')}
    </div>

    <div class="row mt-3 gap-2">
      <button class="btn" id="prevBtn" ${sess.index === 0 ? 'disabled' : ''}>‹ 上一题</button>
      <button class="btn btn-primary btn-block" id="nextBtn" ${sess.index === total - 1 ? 'disabled' : ''}>下一题 ›</button>
    </div>
    <button class="btn btn-danger btn-block mt-2" id="submitBtn">交卷</button>
  `);

  // 启动计时器
  if (sess._timer) clearInterval(sess._timer);
  sess._timer = setInterval(() => {
    const e = Math.floor((Date.now() - sess.startTime) / 1000);
    const r = sess.duration - e;
    if (r <= 0) {
      clearInterval(sess._timer);
      finishExam(sess);
      return;
    }
    const timerEl = $('.exam-timer span:first-child');
    if (timerEl) {
      timerEl.textContent = '⏱ 剩余 ' + fmtTimer(r);
      const bar = $('.exam-timer');
      if (r < 60 && !bar) bar?.classList.add('warn');
      if (bar) bar.classList.toggle('warn', r < 60);
    }
  }, 1000);

  // 渲染答案区
  const answerArea = $('#answerArea');
  const existingAnswer = sess.answers[sess.index];

  if (q.type === 'fill') {
    const { html } = renderFillInputs(q.stem, existingAnswer || []);
    answerArea.innerHTML = `<div class="text-sm text-muted mb-2">${html}</div>`;
  } else {
    answerArea.innerHTML = `<div class="option-list">${renderOptions(q, existingAnswer)}</div>`;
    answerArea.querySelectorAll('.option').forEach(el => {
      el.addEventListener('click', () => {
        const value = el.dataset.value;
        if (q.type === 'multiple') {
          el.classList.toggle('selected');
          const checked = [...answerArea.querySelectorAll('.option.selected')].map(x => x.dataset.value);
          sess.answers[sess.index] = checked;
        } else {
          answerArea.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          sess.answers[sess.index] = q.type === 'judge' ? value === 'true' : value;
        }
        saveSession(sess);
        updateAnsweredCount(sess);
      });
    });
  }
  if (q.type === 'fill') {
    answerArea.querySelectorAll('input.blank-input').forEach(el => {
      el.addEventListener('input', () => {
        sess.answers[sess.index] = collectFillAnswers(answerArea);
        saveSession(sess);
        updateAnsweredCount(sess);
      });
    });
  }
  // 选中态
  highlightCurrent(q, sess.answers[sess.index]);

  // 收藏/取消收藏
  const favBtn = $('#favBtn');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      const on = store.toggleFavorite(q.id);
      favBtn.textContent = on ? '⭐ 已收藏' : '☆ 收藏';
      favBtn.classList.toggle('active', on);
      toast(on ? '已加入收藏' : '已取消收藏', 1200);
    });
  }

  // 跳转
  $$('.answer-cell').forEach(el => {
    el.addEventListener('click', () => {
      sess.index = parseInt(el.dataset.jump);
      saveSession(sess);
      renderRun(bankId);
    });
  });

  $('#prevBtn').addEventListener('click', () => {
    if (sess.index > 0) { sess.index--; saveSession(sess); renderRun(bankId); }
  });
  $('#nextBtn').addEventListener('click', () => {
    if (sess.index < total - 1) { sess.index++; saveSession(sess); renderRun(bankId); }
  });
  $('#submitBtn').addEventListener('click', async () => {
    const answered = sess.answers.filter(a => !isEmptyVal(sess.questions[0], a)).length;
    const unanswered = total - answered;
    let msg = `确认交卷?本次考试共 ${total} 题,已答 ${answered} 题。`;
    if (unanswered > 0) msg += `\n还有 ${unanswered} 题未作答!`;
    const ok = await confirm({ title: '交卷', message: msg.replace(/\n/g, '<br>'), okText: '交卷', danger: unanswered > 0 });
    if (!ok) return;
    finishExam(sess);
  });
}

function saveSession(sess) {
  const copy = { ...sess };
  delete copy._timer;
  sessionStorage.setItem('exam-session', JSON.stringify(copy));
}

function updateAnsweredCount(sess) {
  const cells = $$('.answer-cell');
  cells.forEach((cell, i) => {
    cell.classList.toggle('answered', !isEmptyVal(sess.questions[i], sess.answers[i]));
  });
  const answered = sess.answers.filter((a, i) => !isEmptyVal(sess.questions[i], a)).length;
  const span = $('.exam-timer span:last-child');
  if (span) span.textContent = `已答 ${answered}/${sess.questions.length}`;
}

function $$(sel) { return [...document.querySelectorAll(sel)]; }

function isEmptyVal(q, val) {
  if (q.type === 'fill') {
    if (!Array.isArray(val)) return true;
    return val.every(s => !s || !s.trim());
  }
  if (q.type === 'multiple') return !val || val.length === 0;
  return val === null || val === undefined;
}

function renderOptions(q, selected) {
  if (q.type === 'single') {
    return q.options.map((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      const sel = selected === letter;
      return `<div class="option ${sel ? 'selected' : ''}" data-value="${letter}">
        <div class="key">${letter}</div><div>${escapeHtml(opt)}</div>
      </div>`;
    }).join('');
  } else if (q.type === 'multiple') {
    return q.options.map((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      const sel = (selected || []).includes(letter);
      return `<div class="option ${sel ? 'selected' : ''}" data-value="${letter}">
        <div class="key">${letter}</div><div>${escapeHtml(opt)}</div>
      </div>`;
    }).join('');
  } else if (q.type === 'judge') {
    return `
      <div class="option ${selected === true ? 'selected' : ''}" data-value="true">
        <div class="key">✓</div><div>对</div>
      </div>
      <div class="option ${selected === false ? 'selected' : ''}" data-value="false">
        <div class="key">✗</div><div>错</div>
      </div>
    `;
  }
}

function highlightCurrent(q, ans) {
  const options = $$('.option');
  if (q.type === 'judge') {
    options.forEach(el => {
      if ((el.dataset.value === 'true' && ans === true) ||
          (el.dataset.value === 'false' && ans === false)) {
        el.classList.add('selected');
      }
    });
  } else if (q.type !== 'fill') {
    options.forEach(el => {
      if (Array.isArray(ans) ? ans.includes(el.dataset.value) : ans === el.dataset.value) {
        el.classList.add('selected');
      }
    });
  }
}

// =====================
// 收卷
// =====================

function finishExam(sess) {
  if (sess._timer) clearInterval(sess._timer);
  const settings = store.getSettings();

  sess.questions.forEach((q, i) => {
    sess.results[i] = checkAnswer(q, sess.answers[i], { fillCaseSensitive: settings.fillCaseSensitive });
    if (!sess.results[i].correct && !store.isWrong(q.id)) {
      store.toggleWrong(q.id);
    }
  });

  const total = sess.questions.length;
  const wrong = sess.results.filter(r => r && !r.correct).length;
  const correct = total - wrong;
  // 加权得分:C3 题库按分值计算,其他题库每题 1 分(等价于简单正确率)
  const points = sess.points || new Array(total).fill(1);
  const totalScore = points.reduce((a, b) => a + b, 0);
  const gotScore = sess.results.reduce((s, r, i) => s + (r?.correct ? points[i] : 0), 0);
  const score = totalScore > 0 ? Math.round(gotScore / totalScore * 100) : 0;
  const costMs = Date.now() - sess.startTime;
  const costMin = Math.round(costMs / 60000);

  store.addRecord({
    mode: 'exam',
    bankId: sess.bankId,
    bankName: sess.bankName,
    total, correct, score,
    totalScore,
    gotScore,
    duration: costMs,
    questionIds: sess.questions.map(q => q.id),
    answers: sess.answers,
    results: sess.results
  });

  store.tickTodayCount(total);

  setView(`
    <div class="card text-center" style="padding:30px 20px;">
      <div style="font-size:48px;">${score >= 80 ? '🏆' : score >= 60 ? '🎉' : '💪'}</div>
      <h2 style="margin:12px 0 4px;">考试结束</h2>
      <div class="text-muted">${sess.bankName} · 用时 ${costMin} 分钟</div>
      <div class="stat-row mt-4">
        <div class="stat-cell"><div class="num">${total}</div><div class="label">总题</div></div>
        <div class="stat-cell"><div class="num" style="color:var(--color-success);">${correct}</div><div class="label">答对</div></div>
        <div class="stat-cell"><div class="num" style="color:var(--color-danger);">${wrong}</div><div class="label">答错</div></div>
        ${points.some(p => p !== 1) ? `<div class="stat-cell"><div class="num" style="color:var(--color-primary);">${gotScore}/${totalScore}</div><div class="label">得分</div></div>` : ''}
      </div>
      <div class="mt-4 text-lg fw-700" style="color:${score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">得分 ${score}${points.some(p => p !== 1) ? ` (${gotScore}/${totalScore})` : ''}</div>
    </div>

    <button class="btn btn-primary btn-block" id="reviewBtn">查看答卷</button>
    <button class="btn btn-block mt-2" id="restartBtn">再来一次</button>
    <button class="btn btn-block mt-2" id="backBtn">返回考试</button>
  `);

  // 把正确答案等存到一个临时 session,用于答卷查看
  sessionStorage.setItem('exam-result', JSON.stringify(sess));
  sessionStorage.removeItem('exam-session');

  $('#reviewBtn').addEventListener('click', () => location.hash = '#/stats');
  $('#restartBtn').addEventListener('click', () => location.hash = '#/exam/' + sess.bankId);
  $('#backBtn').addEventListener('click', () => location.hash = '#/exam/' + sess.bankId);
}