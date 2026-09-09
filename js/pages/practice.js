// =====================
// 练习模式
// =====================
import * as store from '../storage.js?v=20260909o';
import { $, setView, escapeHtml, toast, confirm } from '../ui.js?v=20260909o';
import { TYPE_LABELS, TYPE_ICONS, checkAnswer, formatAnswer, formatUserAnswer, renderFillInputs, collectFillAnswers, originalNoLabel } from '../questionTypes.js?v=20260909o';

export function renderPractice(hash) {
  const sub = hash.replace(/^#\/practice\/?/, '');
  const [bankId, mode] = sub.split('/');

  // 练习中
  if (mode === 'run') return renderRun(bankId);
  if (mode === 'wrong') return renderRunWrong();
  if (mode === 'favorite') return renderRunFavorite();

  // 配置
  return renderConfig(bankId);
}

// =====================
// 配置页:选择题库 / 过滤条件 / 范围
// =====================

function renderConfig(bankId) {
  // C3 题库排最前并作为默认选中
  const banks = store.listBanks().slice().sort((a, b) =>
    (b.id === 'bank-c3-all') - (a.id === 'bank-c3-all')
  );
  if (banks.length === 0) {
    setView(`
      <div class="empty">
        <div class="ico">📚</div>
        <p>还没有题库</p>
        <button class="btn btn-primary mt-3" onclick="location.hash='#/bank'">去创建题库</button>
      </div>
    `);
    return;
  }

  const curBank = bankId ? banks.find(b => b.id === bankId) : banks[0];
  if (!curBank) { location.hash = '#/practice'; return; }

  const allTags = [...new Set(curBank.questions.flatMap(q => q.tags || []))];
  const allTypes = [...new Set(curBank.questions.map(q => q.type))];

  setView(`
    <div class="card">
      <label class="field-label">选择题库</label>
      <select id="bankSelect">
        ${banks.map(b => `<option value="${b.id}" ${b.id === curBank.id ? 'selected' : ''}>${escapeHtml(b.name)} (${b.questions?.length || 0})</option>`).join('')}
      </select>
    </div>

    <div class="card">
      <div class="fw-600 mb-2">题目范围</div>
      <div class="form-row">
        <label class="field-label">题型</label>
        <div id="typeFilter" class="row gap-2" style="flex-wrap:wrap;">
          ${allTypes.map(t => `<label class="tag" style="cursor:pointer;"><input type="checkbox" name="type" value="${t}" checked style="margin-right:4px;">${TYPE_ICONS[t]} ${TYPE_LABELS[t]}</label>`).join('')}
        </div>
      </div>
      ${allTags.length ? `
      <div class="form-row">
        <label class="field-label">标签</label>
        <div class="ms-select" id="tagSelect">
          <button type="button" class="ms-toggle" id="tagToggle">🏷️ 全部标签（不限） ▾</button>
          <div class="ms-panel hidden" id="tagPanel">
            <div class="ms-actions">
              <span class="ms-hint">可多选，不选＝全部</span>
              <button type="button" class="ms-action" id="tagAllBtn">全选</button>
              <button type="button" class="ms-action" id="tagNoneBtn">清空</button>
            </div>
            <input type="text" class="ms-search" id="tagSearch" placeholder="🔍 搜索标签...">
            <div class="ms-list" id="tagList">
              ${allTags.map(t => `<label class="ms-option"><input type="checkbox" name="tag" value="${escapeHtml(t)}"><span>${escapeHtml(t)}</span></label>`).join('')}
            </div>
          </div>
        </div>
      </div>
      ` : ''}
      <div class="form-row">
        <label class="field-label">题目数量</label>
        <select id="countSelect">
          <option value="10">10 题</option>
          <option value="20">20 题</option>
          <option value="30">30 题</option>
          <option value="50">50 题</option>
          <option value="0" selected>不限 (全部)</option>
        </select>
      </div>
      <div class="form-row">
        <label class="field-label">顺序</label>
        <select id="orderSelect">
          <option value="sequential" selected>顺序</option>
          <option value="random">随机</option>
        </select>
      </div>
    </div>

    <button class="btn btn-primary btn-block" id="startBtn">开始练习</button>

    <div class="card mt-3" style="background:var(--color-warning-light);border-color:#fde68a;">
      <div class="fw-600" style="color:#b45309;">📕 错题复习 · ${store.getAll().wrongSet.length} 题</div>
      <div class="text-sm mt-2" style="color:#92400e;">从错题本抽取题目重新练习</div>
      <button class="btn btn-block mt-3" id="reviewWrongBtn" style="background:#fff;">复习错题</button>
    </div>

    <div class="card" style="background:#d1fae5;border-color:#a7f3d0;">
      <div class="fw-600" style="color:#047857;">⭐ 收藏复习 · ${store.getAll().favoriteSet.length} 题</div>
      <div class="text-sm mt-2" style="color:#065f46;">重做收藏的题目</div>
      <button class="btn btn-block mt-3" id="reviewFavoriteBtn" style="background:#fff;">复习收藏</button>
    </div>
  `);

  $('#bankSelect').addEventListener('change', (e) => {
    location.hash = '#/practice/' + e.target.value;
  });

  // 标签多选下拉框
  const tagToggle = $('#tagToggle');
  if (tagToggle) {
    const panel = $('#tagPanel');
    const tagBoxes = () => $$('#tagList input[name="tag"]');
    const updateToggle = () => {
      const n = tagBoxes().filter(el => el.checked).length;
      tagToggle.textContent = n === 0 ? '🏷️ 全部标签（不限） ▾'
        : (n === allTags.length ? `🏷️ 已选全部 ${n} 个标签 ▾` : `🏷️ 已选 ${n} / ${allTags.length} 个标签 ▾`);
    };
    tagToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
    });
    panel.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => panel.classList.add('hidden'));
    $('#tagAllBtn').addEventListener('click', () => { tagBoxes().forEach(el => el.checked = true); updateToggle(); });
    $('#tagNoneBtn').addEventListener('click', () => { tagBoxes().forEach(el => el.checked = false); updateToggle(); });
    tagBoxes().forEach(el => el.addEventListener('change', updateToggle));
    $('#tagSearch').addEventListener('input', (e) => {
      const kw = e.target.value.trim();
      panel.querySelectorAll('.ms-option').forEach(label => {
        label.style.display = !kw || label.textContent.includes(kw) ? '' : 'none';
      });
    });
    updateToggle();
  }

  $('#startBtn').addEventListener('click', () => {
    const types = [...$$('input[name="type"]:checked')].map(el => el.value);
    const tags = [...$$('input[name="tag"]:checked')].map(el => el.value);
    const count = parseInt($('#countSelect').value);
    const order = $('#orderSelect').value;

    if (types.length === 0) { toast('至少选一种题型', 1500); return; }

    let questions = curBank.questions.filter(q => types.includes(q.type));
    if (tags.length > 0) {
      questions = questions.filter(q => (q.tags || []).some(t => tags.includes(t)));
    }
    if (questions.length === 0) { toast('没有符合条件的题目', 1500); return; }
    if (order === 'random') {
      questions = questions.slice().sort(() => Math.random() - 0.5);
    }
    if (count > 0) questions = questions.slice(0, count);

    sessionStorage.setItem('practice-session', JSON.stringify({
      bankId: curBank.id,
      bankName: curBank.name,
      questions,
      index: 0,
      answers: new Array(questions.length).fill(null),
      results: new Array(questions.length).fill(null),
      mode: 'practice',
      startTime: Date.now()
    }));
    location.hash = '#/practice/' + curBank.id + '/run';
  });
  $('#reviewWrongBtn').addEventListener('click', () => location.hash = '#/practice/wrong');
  $('#reviewFavoriteBtn').addEventListener('click', () => location.hash = '#/practice/favorite');
}

function $$(sel) { return [...document.querySelectorAll(sel)]; }

// =====================
// 错题复习
// =====================

function renderRunWrong() {
  const qs = store.getWrongQuestions();
  if (qs.length === 0) { setView(emptyMsg('📕', '错题本是空的', '继续练习,错题会自动加入', '#/practice')); return; }
  startRunWith(qs, { bankId: 'wrong', bankName: '错题复习' });
}

function renderRunFavorite() {
  const qs = store.getFavoriteQuestions();
  if (qs.length === 0) { setView(emptyMsg('⭐', '还没有收藏', '在练习或考试中收藏题目', '#/practice')); return; }
  startRunWith(qs, { bankId: 'favorite', bankName: '收藏复习' });
}

function startRunWith(questions, meta) {
  const sess = {
    bankId: meta.bankId,
    bankName: meta.bankName,
    questions,
    index: 0,
    answers: new Array(questions.length).fill(null),
    results: new Array(questions.length).fill(null),
    mode: 'practice',
    startTime: Date.now()
  };
  sessionStorage.setItem('practice-session', JSON.stringify(sess));
  location.hash = '#/practice/' + meta.bankId + '/run';
}

function emptyMsg(ico, t, d, btn) {
  return `<div class="empty"><div class="ico">${ico}</div><p>${t}</p><div class="text-sm text-muted">${d}</div><button class="btn btn-primary mt-3" onclick="location.hash='${btn}'">返回</button></div>`;
}

// =====================
// 答题界面
// =====================

function renderRun(bankId) {
  const sessRaw = sessionStorage.getItem('practice-session');
  if (!sessRaw) { location.hash = '#/practice/' + (bankId || ''); return; }
  const sess = JSON.parse(sessRaw);

  // 处理一下 bankId 不一致(错题/收藏模式)
  if (sess.bankId !== bankId && !['wrong', 'favorite'].includes(sess.bankId)) {
    location.hash = '#/practice/' + sess.bankId + '/run';
    return;
  }

  const q = sess.questions[sess.index];
  const total = sess.questions.length;
  const settings = store.getSettings();
  const progress = ((sess.index + 1) / total * 100).toFixed(0);
  const origLabel = originalNoLabel(q);

  setView(`
    <div class="quiz-bar">
      <span>${sess.index + 1} / ${total}</span>
      <div class="progress"><div class="progress-bar" style="width:${progress}%"></div></div>
      <span>${Math.round(sess.results.filter(Boolean).reduce((s, r) => s + (r?.correct ? 1 : 0), 0) / Math.max(1, sess.results.filter(r => r !== null).length) * 100) || 0}%</span>
    </div>

    <div class="q-card">
      <div class="q-type">${TYPE_ICONS[q.type]} ${TYPE_LABELS[q.type]}${origLabel ? ' · ' + origLabel : ''}${q.difficulty ? ' · ' + '★'.repeat(q.difficulty) : ''}</div>
      <div class="q-stem" id="qStem">${escapeHtml(q.stem)}</div>
      <div id="answerArea"></div>
      <div id="feedbackArea"></div>

      ${q.tags?.length ? `<div class="q-tags">${q.tags.map(t => `<span class="tag tag-gray">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </div>

    <div class="q-actions">
      <button class="btn" id="prevBtn" ${sess.index === 0 ? 'disabled' : ''}>‹ 上一题</button>
      <button class="btn btn-primary" id="submitBtn">提交</button>
      <button class="btn" id="nextBtn">下一题 ›</button>
    </div>

    <div class="jump-row">
      <span class="jump-label">跳到第</span>
      <input type="number" id="jumpInput" min="1" max="${total}" value="${sess.index + 1}" inputmode="numeric">
      <span class="jump-label">题</span>
      <button class="btn btn-sm" id="jumpBtn">跳转</button>
      <span class="jump-total">/ 共 ${total} 题</span>
    </div>
  `);

  // 渲染答题区
  const answerArea = $('#answerArea');
  const existingAnswer = sess.answers[sess.index];
  const result = sess.results[sess.index];

  if (q.type === 'fill') {
    const { html } = renderFillInputs(q.stem, existingAnswer || []);
    answerArea.innerHTML = `<div class="blank-list"><div class="text-sm text-muted mb-2">${html}</div></div>`;
  } else {
    answerArea.innerHTML = `<div class="option-list">${renderOptions(q, existingAnswer)}</div>`;
  }

  // 绑定选项点击
  if (q.type !== 'fill') {
    answerArea.querySelectorAll('.option').forEach(el => {
      el.addEventListener('click', () => {
        if (sess.results[sess.index]) return; // 已批改,不可改(实时读取,避免闭包过期)
        const value = el.dataset.value;
        if (q.type === 'multiple') {
          // 多选:切换
          el.classList.toggle('selected');
          const checked = [...answerArea.querySelectorAll('.option.selected')].map(x => x.dataset.value);
          sess.answers[sess.index] = checked;
        } else {
          // 单选/判断:单选
          answerArea.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          if (q.type === 'judge') sess.answers[sess.index] = value === 'true';
          else sess.answers[sess.index] = value;
        }
        sessionStorage.setItem('practice-session', JSON.stringify(sess));
      });
    });
  } else {
    // 填空:监听 input 变化
    answerArea.querySelectorAll('input.blank-input').forEach(el => {
      el.addEventListener('input', () => {
        sess.answers[sess.index] = collectFillAnswers(answerArea);
        sessionStorage.setItem('practice-session', JSON.stringify(sess));
      });
    });
  }

  // 已批改 → 显示反馈
  if (result) showFeedback(q, sess.answers[sess.index], result);
  else if (existingAnswer !== null) {
    // 已作答但未提交 → 高亮
    highlightCurrent(q, sess.answers[sess.index]);
  }

  // 提交
  $('#submitBtn').addEventListener('click', () => {
    if (sess.results[sess.index]) { goNext(sess); return; } // 已批改,作为下一题(实时读取)
    let ans = sess.answers[sess.index];
    if (q.type === 'fill') ans = collectFillAnswers(answerArea);
    if (isEmpty(q, ans)) { toast('请先作答', 1200); return; }

    const r = checkAnswer(q, ans, { fillCaseSensitive: settings.fillCaseSensitive });
    sess.results[sess.index] = r;
    sess.answers[sess.index] = ans;
    sessionStorage.setItem('practice-session', JSON.stringify(sess));

    // 答错加入错题本;答对不自动移除(由用户自己标记掌握)
    if (!r.correct && !store.isWrong(q.id)) {
      store.toggleWrong(q.id);
    }

    // 累计每日
    store.tickTodayCount(1);

    showFeedback(q, ans, r);
  });

  $('#nextBtn').addEventListener('click', () => goNext(sess));
  $('#prevBtn').addEventListener('click', () => {
    if (sess.index > 0) {
      sess.index--;
      sessionStorage.setItem('practice-session', JSON.stringify(sess));
      renderRun(bankId);
    }
  });

  // 跳转到指定题号
  const jumpInput = $('#jumpInput');
  function doJump() {
    const n = parseInt(jumpInput.value);
    if (!n || n < 1 || n > total) { toast(`请输入 1 - ${total} 之间的题号`, 1500); return; }
    sess.index = n - 1;
    sessionStorage.setItem('practice-session', JSON.stringify(sess));
    renderRun(bankId);
  }
  $('#jumpBtn').addEventListener('click', doJump);
  jumpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doJump(); } });
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

function isEmpty(q, ans) {
  if (q.type === 'fill') {
    if (!Array.isArray(ans)) return true;
    return ans.every(s => !s || !s.trim());
  }
  if (q.type === 'multiple') return !ans || ans.length === 0;
  return ans === null || ans === undefined;
}

function showFeedback(q, userAnswer, result) {
  const area = $('#feedbackArea');
  const cls = result.correct ? 'correct' : (result.partial ? '' : 'wrong');
  const label = result.correct ? '✓ 回答正确' : (result.partial ? '⚠ 部分正确' : '✗ 回答错误');
  area.innerHTML = `
    <div class="feedback ${cls}">
      <div class="label">${label}</div>
      ${result.correct ? '' : `<div>正确答案: ${formatAnswer(q)}</div>`}
      ${userAnswer !== undefined && !result.correct ? `<div>你的答案: ${formatUserAnswer(q, userAnswer)}</div>` : ''}
      ${q.explanation ? `<div class="mt-2">💡 ${escapeHtml(q.explanation)}</div>` : ''}
    </div>
  `;

  // 高亮选项
  $$('.option').forEach(el => {
    el.style.cursor = 'default';
    const v = el.dataset.value;
    if (q.type === 'judge') {
      if (v === 'true' && q.answer === true) el.classList.add('correct');
      if (v === 'false' && q.answer === false) el.classList.add('correct');
      if (v === 'true' && userAnswer === true && q.answer !== true) el.classList.add('wrong');
      if (v === 'false' && userAnswer === false && q.answer !== false) el.classList.add('wrong');
    } else if (q.type !== 'multiple') {
      if (v === q.answer) el.classList.add('correct');
      if (v === userAnswer && v !== q.answer) el.classList.add('wrong');
    } else {
      const ansArr = Array.isArray(q.answer) ? q.answer : [];
      if (ansArr.includes(v)) el.classList.add('correct');
      if (Array.isArray(userAnswer) && userAnswer.includes(v) && !ansArr.includes(v)) el.classList.add('wrong');
    }
  });

  // 显示答错时将题目加入错题
  if (!result.correct && !store.isWrong(q.id)) {
    store.toggleWrong(q.id);
  }

  $('#submitBtn').textContent = '下一题';
  $('#nextBtn').disabled = false;
}

function goNext(sess) {
  if (sess.index < sess.questions.length - 1) {
    sess.index++;
    sessionStorage.setItem('practice-session', JSON.stringify(sess));
    renderRun(sess.bankId);
  } else {
    // 完成
    showSummary(sess);
  }
}

function showSummary(sess) {
  const total = sess.questions.length;
  const correct = sess.results.filter(r => r?.correct).length;
  const wrong = sess.results.filter(r => r && !r.correct).length;
  const score = Math.round(correct / total * 100);
  const costMs = Date.now() - sess.startTime;
  const costMin = Math.round(costMs / 60000);

  // 保存记录
  store.addRecord({
    mode: 'practice',
    bankId: sess.bankId,
    bankName: sess.bankName,
    total,
    correct,
    score,
    duration: costMs,
    questionIds: sess.questions.map(q => q.id),
    answers: sess.answers,
    results: sess.results
  });

  setView(`
    <div class="card text-center" style="padding:30px 20px;">
      <div style="font-size:48px;">${score >= 80 ? '🎉' : score >= 60 ? '👍' : '💪'}</div>
      <h2 style="margin:12px 0 4px;">练习完成</h2>
      <div class="text-muted">${sess.bankName} · 用时 ${costMin} 分钟</div>
      <div class="stat-row mt-4">
        <div class="stat-cell"><div class="num">${total}</div><div class="label">总题数</div></div>
        <div class="stat-cell"><div class="num" style="color:var(--color-success);">${correct}</div><div class="label">答对</div></div>
        <div class="stat-cell"><div class="num" style="color:var(--color-danger);">${wrong}</div><div class="label">答错</div></div>
      </div>
      <div class="mt-4 text-lg fw-700" style="color:${score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">正确率 ${score}%</div>
    </div>

    <button class="btn btn-primary btn-block" id="reviewWrongBtn">查看错题 (${wrong})</button>
    <button class="btn btn-block mt-2" id="restartBtn">再来一组</button>
    <button class="btn btn-block mt-2" id="backBtn">返回题库</button>
  `);

  sessionStorage.removeItem('practice-session');

  $('#reviewWrongBtn').addEventListener('click', () => location.hash = '#/practice/wrong');
  $('#restartBtn').addEventListener('click', () => location.hash = '#/practice/' + sess.bankId);
  $('#backBtn').addEventListener('click', () => location.hash = '#/practice/' + sess.bankId);
}