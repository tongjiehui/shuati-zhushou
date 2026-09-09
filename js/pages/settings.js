// =====================
// 设置
// =====================
import * as store from '../storage.js?v=20260909p';
import { $, setView, toast, confirm, downloadFile, pickFile, fmtDate } from '../ui.js?v=20260909p';

export function renderSettings() {
  const data = store.getAll();
  const s = data.settings;

  setView(`
    <div class="section-title">学习设置</div>
    <div class="card">
      <div class="form-row">
        <label class="field-label">每日目标题数</label>
        <input type="number" id="dailyGoal" min="1" max="500" value="${s.dailyGoal}" />
      </div>
      <div class="form-row">
        <label class="row gap-2">
          <input type="checkbox" id="caseSensitive" ${s.fillCaseSensitive ? 'checked' : ''} style="width:auto;" />
          <span>填空题答案区分大小写</span>
        </label>
      </div>
      <button class="btn btn-primary btn-block" id="saveBtn">保存设置</button>
    </div>

    <div class="section-title">数据管理</div>
    <div class="card">
      <button class="btn btn-block" id="exportAllBtn">📤 导出全部数据</button>
      <button class="btn btn-block mt-2" id="importAllBtn">📥 导入数据 (合并)</button>
      <div class="text-sm text-muted mt-2">导出包含题库、错题、收藏、历史记录,JSON 格式</div>
    </div>

    <div class="card" style="border-color:var(--color-warning-light);">
      <div class="fw-600" style="color:var(--color-warning);">⚠ 清空数据</div>
      <div class="text-sm text-muted mt-2">清空所有题库、错题、记录。建议先导出备份。</div>
      <button class="btn btn-danger btn-block mt-3" id="clearBtn">清空全部数据</button>
    </div>

    <div class="section-title">关于</div>
    <div class="card text-sm text-muted" style="line-height:1.8;">
      <div><strong class="text-strong" style="color:var(--color-text);">刷题助手 v1.0</strong></div>
      <div>通用题库练习 / 考试 · H5 网页应用</div>
      <div class="mt-2">数据全部存储在浏览器本地 (localStorage),不依赖任何服务器</div>
      <div class="mt-2">题库总数: <strong>${data.banks.length}</strong> · 题目总数: <strong>${data.banks.reduce((s, b) => s + (b.questions?.length || 0), 0)}</strong></div>
    </div>
  `);

  $('#saveBtn').addEventListener('click', () => {
    store.updateSettings({
      dailyGoal: Math.max(1, parseInt($('#dailyGoal').value) || 20),
      fillCaseSensitive: $('#caseSensitive').checked
    });
    toast('已保存');
  });
  $('#exportAllBtn').addEventListener('click', () => {
    const json = store.exportAll();
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(`quiz-backup-${ts}.json`, json);
    toast('已导出');
  });
  $('#importAllBtn').addEventListener('click', async () => {
    const text = await pickFile();
    if (!text) return;
    try {
      const obj = JSON.parse(text);
      if (!obj.banks) throw new Error('格式不正确,需要包含 banks 数组');
      const ok = await confirm({ title: '确认导入?', message: `将合并 ${obj.banks.length} 个题库(同 ID 覆盖,新 ID 追加)。当前错题和记录会保留。` });
      if (!ok) return;
      store.importJson(text, { merge: true });
      toast('已合并导入');
      location.hash = '#/home';
    } catch (e) {
      toast('导入失败: ' + e.message, 2000);
    }
  });
  $('#clearBtn').addEventListener('click', async () => {
    const ok = await confirm({
      title: '清空所有数据?',
      message: '这将删除所有题库、错题、收藏和历史记录,且无法恢复!',
      danger: true, okText: '清空'
    });
    if (!ok) return;
    const ok2 = await confirm({
      title: '再次确认',
      message: '真的真的要清空吗?',
      danger: true, okText: '确认清空'
    });
    if (!ok2) return;
    store.resetAll();
    toast('已清空');
    location.hash = '#/home';
  });
}