// =====================
// 统计 / 错题本 / 历史
// =====================
import * as store from '../storage.js?v=20260909q';
import { $, setView, escapeHtml, toast, fmtRelative, confirm } from '../ui.js?v=20260909q';
import { TYPE_LABELS, TYPE_ICONS, formatAnswer, formatUserAnswer, originalNoLabel } from '../questionTypes.js?v=20260909q';

export function renderStats(hash) {
  const sub = hash.replace(/^#\/stats\/?/, '');
  if (sub.startsWith('wrong/')) return renderWrongDetail(sub.split('/')[1]);
  if (sub.startsWith('record/')) return renderRecordDetail(sub.split('/')[1]);
  if (sub === 'wrong') return renderWrongList();
  if (sub === 'favorite') return renderFavoriteList();
  if (sub === 'records') return renderRecordList();
  return renderOverview();
}

// =====================
// 总览
// =====================

function renderOverview() {
  const data = store.getAll();
  const wrongCount = data.wrongSet.length;
  const favoriteCount = data.favoriteSet.length;

  const examRecs = data.records.filter(r => r.mode === 'exam');
  const totalExam = examRecs.length;
  const avgScore = totalExam ? Math.round(examRecs.reduce((s, r) => s + r.score, 0) / totalExam) : 0;

  const settings = data.settings;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = settings.lastStudyDate === today ? settings.todayCount : 0;

  setView(`
    <div class="hero">
      <h2>学习数据</h2>
      <p>坚持每天进步一点点</p>
      <div class="hero-stats">
        <div class="hero-stat"><div class="num">${todayCount}</div><div class="label">今日答题</div></div>
        <div class="hero-stat"><div class="num">${totalExam}</div><div class="label">累计考试</div></div>
        <div class="hero-stat"><div class="num">${avgScore}</div><div class="label">平均分</div></div>
      </div>
    </div>

    <div class="section-title">练习方向</div>
    <div class="quick-actions">
      <div class="quick-action" data-go="wrong">
        <div class="ico" style="background:var(--color-danger-light);color:var(--color-danger);">📕</div>
        <div><div class="name">错题本</div><div class="desc">${wrongCount} 道错题待巩固</div></div>
      </div>
      <div class="quick-action" data-go="favorite">
        <div class="ico" style="background:#d1fae5;color:#047857;">⭐</div>
        <div><div class="name">我的收藏</div><div class="desc">${favoriteCount} 道收藏题目</div></div>
      </div>
      <div class="quick-action" data-go="records">
        <div class="ico" style="background:var(--color-primary-light);color:var(--color-primary);">📜</div>
        <div><div class="name">历史记录</div><div class="desc">${data.records.length} 次练习/考试</div></div>
      </div>
    </div>

    ${examRecs.length ? `
    <div class="section-title">最近考试</div>
    <div class="card" style="padding:0;">
      ${examRecs.slice(0, 5).map((r, i) => `
        <div data-rec="${r.id}" style="padding:12px 14px;${i < Math.min(5, examRecs.length) - 1 ? 'border-bottom:1px solid var(--color-border);' : ''}cursor:pointer;">
          <div class="row between">
            <div>
              <div style="font-size:14px;">${escapeHtml(r.bankName)}</div>
              <div class="text-sm text-muted">${fmtRelative(r.finishedAt)} · ${r.total} 题 · 答对 ${r.correct}</div>
            </div>
            <div class="fw-700" style="color:${r.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${r.score}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section-title mt-4">题型分布</div>
    <div class="card">
      ${renderTypeDistribution()}
    </div>
  `);

  document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/stats/' + el.dataset.go);
  });
  document.querySelectorAll('[data-rec]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/stats/record/' + el.dataset.rec);
  });
}

function renderTypeDistribution() {
  const data = store.getAll();
  const stats = {};
  data.banks.forEach(b => (b.questions || []).forEach(q => {
    if (!stats[q.type]) stats[q.type] = { total: 0, wrong: 0 };
    stats[q.type].total++;
    if (data.wrongSet.some(w => w.questionId === q.id)) stats[q.type].wrong++;
  }));
  const entries = Object.entries(stats);
  if (entries.length === 0) return '<div class="text-muted text-sm">暂无题目</div>';

  return entries.map(([t, s]) => {
    const wrongRate = s.total ? Math.round(s.wrong / s.total * 100) : 0;
    return `
      <div class="mb-2">
        <div class="row between text-sm"><span>${TYPE_ICONS[t]} ${TYPE_LABELS[t]}</span><span class="text-muted">${s.total} 题</span></div>
        <div style="height:6px;background:#f1f5f9;border-radius:3px;margin-top:4px;overflow:hidden;">
          <div style="height:100%;width:${wrongRate}%;background:var(--color-danger);border-radius:3px;"></div>
        </div>
        <div class="text-sm text-muted mt-2">错题率 ${wrongRate}%</div>
      </div>
    `;
  }).join('');
}

// =====================
// 错题列表
// =====================

function renderWrongList() {
  const qs = store.getWrongQuestions();
  setView(`
    <div class="row between mb-2">
      <span>${qs.length} 道错题</span>
      <button class="btn" id="reviewBtn">📝 一键复习</button>
    </div>
    ${qs.length === 0 ? `<div class="empty"><div class="ico">📭</div><p>暂无错题</p></div>` : ''}
    <div>
      ${qs.map((q, i) => renderQuestionCard(q, i, true)).join('')}
    </div>
  `);
  $('#reviewBtn').addEventListener('click', () => location.hash = '#/practice/wrong');
  document.querySelectorAll('[data-qid]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/stats/wrong/' + el.dataset.qid);
  });
  document.querySelectorAll('[data-toggle-wrong]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      store.toggleWrong(el.dataset.toggleWrong);
      toast('已从错题本移除');
      renderWrongList();
    });
  });
  document.querySelectorAll('[data-toggle-fav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const r = store.toggleFavorite(el.dataset.toggleFav);
      toast(r ? '已收藏' : '已取消收藏');
    });
  });
}

// =====================
// 收藏列表
// =====================

function renderFavoriteList() {
  const qs = store.getFavoriteQuestions();
  setView(`
    <div class="row between mb-2">
      <span>${qs.length} 道收藏题</span>
      <button class="btn" id="reviewBtn">📝 一键复习</button>
    </div>
    ${qs.length === 0 ? `<div class="empty"><div class="ico">📭</div><p>暂无收藏</p></div>` : ''}
    <div>
      ${qs.map((q, i) => renderQuestionCard(q, i, false)).join('')}
    </div>
  `);
  $('#reviewBtn').addEventListener('click', () => location.hash = '#/practice/favorite');
  document.querySelectorAll('[data-qid]').forEach(el => {
    el.addEventListener('click', () => {
      // 进入题库详情定位题目
      location.hash = '#/bank/' + el.dataset.bank;
    });
  });
  document.querySelectorAll('[data-toggle-fav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      store.toggleFavorite(el.dataset.toggleFav);
      toast('已取消收藏');
      renderFavoriteList();
    });
  });
}

// =====================
// 历史记录
// =====================

function renderRecordList() {
  const recs = store.listRecords();
  setView(`
    ${recs.length === 0 ? `<div class="empty"><div class="ico">📜</div><p>暂无记录</p></div>` : ''}
    <div>
      ${recs.map(r => `
        <div class="card" data-rec="${r.id}" style="cursor:pointer;">
          <div class="row between">
            <div>
              <div style="font-size:14px;">${r.mode === 'exam' ? '📝 考试' : '✏️ 练习'} · ${escapeHtml(r.bankName || '')}</div>
              <div class="text-sm text-muted mt-2">${fmtRelative(r.finishedAt)} · ${r.total} 题 · 答对 ${r.correct} 题</div>
            </div>
            <div class="fw-700" style="color:${r.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${r.score}%</div>
          </div>
        </div>
      `).join('')}
    </div>
  `);
  document.querySelectorAll('[data-rec]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/stats/record/' + el.dataset.rec);
  });
}

// =====================
// 单题 / 答卷详情
// =====================

function renderWrongDetail(qid) {
  const qs = store.getWrongQuestions();
  const q = qs.find(x => x.id === qid);
  if (!q) { setView(`<div class="empty">题目不存在</div>`); return; }
  renderQuestionDetail(q);
}

function renderRecordDetail(rid) {
  const rec = store.listRecords().find(r => r.id === rid);
  if (!rec) { setView(`<div class="empty">记录不存在</div>`); return; }

  // 题目完整数据
  const data = store.getAll();
  const qMap = new Map();
  data.banks.forEach(b => b.questions.forEach(q => qMap.set(q.id, { ...q, bankId: b.id, bankName: b.name })));

  setView(`
    <div class="card">
      <div class="row between">
        <div>
          <div class="fw-700 text-lg">${rec.mode === 'exam' ? '📝 考试' : '✏️ 练习'}答卷</div>
          <div class="text-sm text-muted">${escapeHtml(rec.bankName || '')} · ${fmtRelative(rec.finishedAt)}</div>
        </div>
        <div class="fw-700" style="font-size:24px;color:${rec.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${rec.score}%</div>
      </div>
      <div class="stat-row mt-3">
        <div class="stat-cell"><div class="num">${rec.total}</div><div class="label">总题</div></div>
        <div class="stat-cell"><div class="num" style="color:var(--color-success);">${rec.correct}</div><div class="label">答对</div></div>
        <div class="stat-cell"><div class="num" style="color:var(--color-danger);">${rec.total - rec.correct}</div><div class="label">答错</div></div>
      </div>
    </div>

    <div class="section-title">答题详情</div>
    <div>
      ${rec.questionIds.map((qid, i) => {
        const q = qMap.get(qid);
        if (!q) return '';
        return renderAnsweredQuestion(q, rec.answers[i], rec.results[i], i + 1);
      }).join('')}
    </div>

    <button class="btn btn-block mt-3" id="deleteBtn" style="color:var(--color-danger);">删除这条记录</button>
  `);

  $('#deleteBtn').addEventListener('click', async () => {
    const ok = await confirm({ title: '删除记录?', message: '此操作不可撤销', danger: true, okText: '删除' });
    if (!ok) return;
    store.deleteRecord(rid);
    toast('已删除');
    location.hash = '#/stats/records';
  });
}

function renderAnsweredQuestion(q, userAns, result, idx) {
  const correct = result?.correct;
  return `
    <div class="question-item" style="border-color:${correct ? 'var(--color-success-light)' : 'var(--color-danger-light)'};">
      <div class="q-meta">
        <span class="tag ${correct ? 'tag-green' : 'tag-red'}">${correct ? '✓ 正确' : '✗ 错误'}</span>
        <span class="tag tag-gray">${TYPE_ICONS[q.type]} ${TYPE_LABELS[q.type]}</span>
        <span>#${idx}${originalNoLabel(q) ? ' · ' + originalNoLabel(q) : ''}</span>
      </div>
      <div class="q-body">${escapeHtml(q.stem)}</div>
      <div class="mt-2 text-sm">
        <div>你的答案: <span class="fw-600">${formatUserAnswer(q, userAns)}</span></div>
        ${!correct ? `<div class="text-sm" style="color:var(--color-danger);">正确答案: ${formatAnswer(q)}</div>` : ''}
        ${q.explanation ? `<div class="text-sm text-muted mt-2">💡 ${escapeHtml(q.explanation)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderQuestionCard(q, idx, isWrong) {
  return `
    <div class="question-item" data-qid="${q.id}" data-bank="${q.bankId}" style="cursor:pointer;">
      <div class="q-meta">
        <span class="tag tag-gray">${TYPE_ICONS[q.type]} ${TYPE_LABELS[q.type]}</span>
        <span class="tag tag-gray">${escapeHtml(q.bankName || '')}</span>
        <span>#${idx + 1}${originalNoLabel(q) ? ' · ' + originalNoLabel(q) : ''}</span>
      </div>
      <div class="q-body">${escapeHtml(q.stem.slice(0, 100))}${q.stem.length > 100 ? '...' : ''}</div>
      <div class="q-actions">
        ${isWrong ? `<button class="q-action-btn danger" data-toggle-wrong="${q.id}">移出错题本</button>` : ''}
        <button class="q-action-btn" data-toggle-fav="${q.id}">${store.isFavorite(q.id) ? '取消收藏' : '⭐ 收藏'}</button>
      </div>
    </div>
  `;
}

function renderQuestionDetail(q) {
  setView(`
    <div class="q-card">
      <div class="q-meta row gap-2 mb-2">
        <span class="tag tag-gray">${TYPE_ICONS[q.type]} ${TYPE_LABELS[q.type]}</span>
        ${originalNoLabel(q) ? `<span class="tag tag-gray">${originalNoLabel(q)}</span>` : ''}
        <span class="tag tag-gray">${escapeHtml(q.bankName || '')}</span>
      </div>
      <div class="q-stem">${escapeHtml(q.stem)}</div>
      ${q.options?.length ? `
        <div class="option-list mt-3">
          ${q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isAns = Array.isArray(q.answer) ? q.answer.includes(letter) : q.answer === letter;
            return `<div class="option ${isAns ? 'correct' : ''}">
              <div class="key">${letter}</div><div>${escapeHtml(opt)}</div>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
      ${q.type === 'judge' ? `
        <div class="text-sm mt-3">答案: <span class="fw-600">${q.answer ? '✓ 对' : '✗ 错'}</span></div>
      ` : ''}
      ${q.type === 'fill' ? `<div class="text-sm mt-3">答案: <span class="fw-600">${(q.answer || []).join(' | ')}</span></div>` : ''}
      ${q.explanation ? `<div class="feedback correct mt-3">💡 ${escapeHtml(q.explanation)}</div>` : ''}
    </div>

    <div class="row gap-2 mt-3">
      <button class="btn btn-block" id="toggleFavBtn">${store.isFavorite(q.id) ? '取消收藏' : '⭐ 收藏'}</button>
      <button class="btn btn-block" id="toggleWrongBtn">${store.isWrong(q.id) ? '移出错题本' : '加入错题本'}</button>
    </div>
  `);

  $('#toggleFavBtn').addEventListener('click', () => {
    const r = store.toggleFavorite(q.id);
    toast(r ? '已收藏' : '已取消收藏');
    renderQuestionDetail(q);
  });
  $('#toggleWrongBtn').addEventListener('click', () => {
    const r = store.toggleWrong(q.id);
    toast(r ? '已加入错题本' : '已移出错题本');
    renderQuestionDetail(q);
  });
}