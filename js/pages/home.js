// =====================
// 首页
// =====================
import * as store from '../storage.js?v=20260909s';
import { fmtRelative, setView } from '../ui.js?v=20260909s';

export function renderHome() {
  const data = store.getAll();
  const settings = data.settings;
  const today = new Date().toISOString().slice(0, 10);
  if (settings.lastStudyDate !== today) {
    settings.todayCount = 0;
  }
  const bankCount = data.banks.length;
  const questionCount = data.banks.reduce((s, b) => s + (b.questions?.length || 0), 0);
  const wrongCount = data.wrongSet.length;
  const favoriteCount = data.favoriteSet.length;
  const recentRecords = data.records.slice(0, 3);

  const todayPercent = Math.min(100, Math.round((settings.todayCount / Math.max(1, settings.dailyGoal)) * 100));

  setView(`
    <div class="hero">
      <h2>开始今天的练习 👋</h2>
      <p>距离每日目标还差 ${Math.max(0, settings.dailyGoal - settings.todayCount)} 题</p>
      <div style="height:6px;background:rgba(255,255,255,.25);border-radius:3px;margin-top:10px;overflow:hidden;">
        <div style="height:100%;width:${todayPercent}%;background:#fff;border-radius:3px;"></div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="num">${bankCount}</div><div class="label">题库</div></div>
        <div class="hero-stat"><div class="num">${questionCount}</div><div class="label">题目</div></div>
        <div class="hero-stat"><div class="num">${wrongCount}</div><div class="label">错题</div></div>
      </div>
    </div>

    <div class="section-title">快速开始</div>
    <div class="quick-actions">
      <div class="quick-action" data-go="practice">
        <div class="ico" style="background:var(--color-primary-light);color:var(--color-primary);">✏️</div>
        <div>
          <div class="name">开始练习</div>
          <div class="desc">单题模式 · 即时反馈</div>
        </div>
      </div>
      <div class="quick-action" data-go="exam">
        <div class="ico" style="background:#fef3c7;color:#b45309;">📝</div>
        <div>
          <div class="name">模拟考试</div>
          <div class="desc">限时答题 · 自动评分</div>
        </div>
      </div>
      <div class="quick-action" data-go="wrong">
        <div class="ico" style="background:#fee2e2;color:#b91c1c;">📕</div>
        <div>
          <div class="name">错题本</div>
          <div class="desc">复习巩固 · 共 ${wrongCount} 题</div>
        </div>
      </div>
      <div class="quick-action" data-go="favorite">
        <div class="ico" style="background:#d1fae5;color:#047857;">⭐</div>
        <div>
          <div class="name">我的收藏</div>
          <div class="desc">重点标记 · 共 ${favoriteCount} 题</div>
        </div>
      </div>
    </div>

    ${data.banks.length ? `
    <div class="section-title">我的题库</div>
    <div class="bank-list">
      ${data.banks.slice(0, 3).map(b => `
        <div class="bank-item" data-bank="${b.id}">
          <div>
            <div class="name">${escapeHtml(b.name)}</div>
            <div class="meta">${b.questions?.length || 0} 题${b.tags?.length ? ' · ' + b.tags.map(t => '#' + t).join(' ') : ''}</div>
          </div>
          <div class="text-muted">›</div>
        </div>
      `).join('')}
      ${data.banks.length > 3 ? `<div class="text-center text-sm text-muted" data-go="bank" style="padding:8px;cursor:pointer;">查看全部 ${data.banks.length} 个题库 ›</div>` : ''}
    </div>
    ` : `
    <div class="empty">
      <div class="ico">📚</div>
      <p>还没有题库</p>
      <button class="btn btn-primary mt-3" data-go="bank">立即导入</button>
    </div>
    `}

    ${recentRecords.length ? `
    <div class="section-title">最近活动</div>
    <div class="card" style="padding:0;">
      ${recentRecords.map((r, i) => `
        <div style="padding:12px 14px;${i < recentRecords.length - 1 ? 'border-bottom:1px solid var(--color-border);' : ''}display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:14px;">${r.mode === 'exam' ? '📝' : '✏️'} ${r.total} 题 · 答对 ${r.correct} 题</div>
            <div class="text-sm text-muted">${fmtRelative(r.finishedAt)}</div>
          </div>
          <div class="fw-700" style="color:${r.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${r.score}%</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `);

  // 绑定事件
  document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/' + el.dataset.go);
  });
  document.querySelectorAll('[data-bank]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/bank/' + el.dataset.bank);
  });
}

function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}