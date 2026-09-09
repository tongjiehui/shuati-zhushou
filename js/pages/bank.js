// =====================
// 题库管理
// =====================
import * as store from '../storage.js?v=20260909s';
import { $, setView, escapeHtml, toast, confirm, formModal, downloadFile, pickFile, fmtDate } from '../ui.js?v=20260909s';
import { TYPE_LABELS, TYPE_ICONS, originalNoLabel } from '../questionTypes.js?v=20260909s';
import { C3_BANKS } from '../data/c3-bank.js';

export function renderBank(hash) {
  const subPath = hash.replace(/^#\/bank\/?/, '');
  if (!subPath) return renderBankList();
  if (subPath === 'new') return renderBankEdit(null);
  const [bankId, ...rest] = subPath.split('/');
  const restPath = rest.join('/');
  if (restPath === 'edit') return renderBankEdit(bankId);
  if (restPath === 'import') return renderImport(bankId);
  if (restPath.startsWith('question/')) {
    const qid = restPath.split('/')[1];
    return renderQuestionEdit(bankId, qid === 'new' ? null : qid);
  }
  return renderBankDetail(bankId);
}

// =====================
// 题库列表
// =====================

function renderBankList() {
  const banks = store.listBanks();
  setView(`
    <div class="row gap-2 mt-2">
      <button class="btn btn-primary btn-block" id="newBankBtn">＋ 新建题库</button>
      <button class="btn btn-block" id="importBankBtn">📥 导入</button>
    </div>

    ${!store.listBanks().some(b => b.id === 'bank-c3-all') ? `
    <button class="btn btn-block mt-2" id="importC3Btn">📦 导入 C3 安全考核题库(2965 题·合并版)</button>
    ` : ''}

    ${banks.length === 0 ? `
    <div class="empty mt-4">
      <div class="ico">📚</div>
      <p>还没有题库,先新建一个或导入一个 JSON 题库吧</p>
    </div>
    ` : `
    <div class="section-title mt-3">所有题库 (${banks.length})</div>
    <div class="bank-list">
      ${banks.map(b => `
        <div class="bank-item" data-bank="${b.id}">
          <div>
            <div class="name">${escapeHtml(b.name)}</div>
            <div class="meta">
              ${b.questions?.length || 0} 题
              ${b.description ? ' · ' + escapeHtml(b.description.slice(0, 30)) : ''}
              ${b.tags?.length ? ' · ' + b.tags.map(t => '#' + escapeHtml(t)).join(' ') : ''}
            </div>
          </div>
          <div class="text-muted">›</div>
        </div>
      `).join('')}
    </div>
    `}

    <div class="section-title mt-4">支持的题库 JSON 格式</div>
    <div class="card text-sm text-muted" style="line-height:1.7;">
      可以是单个题库(只含 <code>name</code> + <code>questions</code>),也可以是包含 <code>banks</code> 数组的完整结构。题目支持类型:<br>
      <code>single</code>(单选) / <code>multiple</code>(多选) / <code>judge</code>(判断) / <code>fill</code>(填空)。
      <button class="btn btn-block mt-3" id="downloadTemplateBtn">📄 下载模板</button>
    </div>
  `);

  $('#newBankBtn').addEventListener('click', () => location.hash = '#/bank/new');
  const importC3Btn = $('#importC3Btn');
  if (importC3Btn) {
    importC3Btn.addEventListener('click', () => {
      try {
        localStorage.removeItem('c3-bank-removed');
        const n = store.importJson(JSON.stringify(C3_BANKS), { merge: true });
        // 清理旧版三个分题型题库(题目 id 一致,错题/收藏记录保留)
        ['bank-c3-single', 'bank-c3-multiple', 'bank-c3-judge'].forEach(id => {
          if (store.listBanks().some(b => b.id === id)) store.deleteBank(id);
        });
        toast(`已导入 C3 题库(合并版),当前共 ${store.listBanks().length} 个题库`);
        renderBank('#/bank');
      } catch (e) {
        toast('导入失败:' + e.message, 3000);
      }
    });
  }
  $('#importBankBtn').addEventListener('click', () => {
    pickFile().then(text => {
      if (!text) return;
      try {
        const obj = JSON.parse(text);
        if (obj.banks) {
          const n = store.importJson(text, { merge: false });
          toast(`已导入 ${n} 个题库`);
          renderBank('#/bank');
        } else if (obj.name && obj.questions) {
          const bank = store.importBankFromJson(text);
          toast(`已导入题库「${bank.name}」`);
          location.hash = '#/bank/' + bank.id;
        } else {
          toast('JSON 格式不正确', 2000);
        }
      } catch (e) {
        toast('解析失败:' + e.message, 2000);
      }
    });
  });
  $('#downloadTemplateBtn').addEventListener('click', () => {
    const tpl = {
      name: '示例题库',
      description: '这是一个示例题库',
      tags: ['示例'],
      questions: [
        { type: 'single', stem: '中国的首都是?', options: ['北京','上海','广州','深圳'], answer: '北京', explanation: '北京是中华人民共和国首都', tags: ['地理'], difficulty: 1 },
        { type: 'multiple', stem: '下列哪些是编程语言?', options: ['HTML','Python','Java','CSS'], answer: ['Python','Java'], explanation: 'HTML 和 CSS 是标记语言,非编程语言', tags: ['计算机'], difficulty: 2 },
        { type: 'judge', stem: '地球是圆的', answer: true, explanation: '近似球体', tags: ['地理'], difficulty: 1 },
        { type: 'fill', stem: '《静夜思》的作者是___朝诗人___。', answer: ['唐','李白'], explanation: '李白,唐代浪漫主义诗人', tags: ['文学'], difficulty: 1 }
      ]
    };
    downloadFile('quiz-template.json', JSON.stringify(tpl, null, 2));
  });

  document.querySelectorAll('[data-bank]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/bank/' + el.dataset.bank);
  });
}

// =====================
// 题库详情
// =====================

function renderBankDetail(bankId) {
  const bank = store.getBank(bankId);
  if (!bank) {
    setView(`<div class="empty"><div class="ico">⚠️</div><p>题库不存在</p></div>`);
    return;
  }
  const questions = bank.questions || [];
  const typeStats = {};
  questions.forEach(q => typeStats[q.type] = (typeStats[q.type] || 0) + 1);

  setView(`
    <div class="card">
      <div class="row between">
        <div>
          <div class="text-lg fw-700">${escapeHtml(bank.name)}</div>
          ${bank.description ? `<div class="text-sm text-muted mt-2">${escapeHtml(bank.description)}</div>` : ''}
          ${bank.tags?.length ? `<div class="mt-2">${bank.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        <button class="icon-btn" id="editBankBtn">✎</button>
      </div>
      <div class="row gap-3 mt-3 text-sm text-muted">
        <span>共 ${questions.length} 题</span>
        ${Object.entries(typeStats).map(([t, n]) => `<span>${TYPE_ICONS[t]} ${TYPE_LABELS[t]} ${n}</span>`).join('')}
      </div>
    </div>

    <div class="row gap-2">
      <button class="btn btn-primary btn-block" id="practiceBtn">开始练习 ›</button>
      <button class="btn btn-block" id="examBtn">组卷考试 ›</button>
    </div>

    <div class="row gap-2 mt-2">
      <button class="btn btn-block" id="addQuestionBtn">＋ 添加题目</button>
      <button class="btn btn-block" id="importQuestionBtn">📥 批量导入</button>
      <button class="btn btn-block" id="exportBankBtn">📤 导出</button>
    </div>

    <div class="section-title mt-3">题目列表 (${questions.length})</div>
    ${questions.length === 0 ? `
    <div class="empty"><div class="ico">📝</div><p>暂无题目,添加一道吧</p></div>
    ` : `
    <div id="questionListContainer">
      ${questions.slice(0, 50).map((q, idx) => renderQuestionRow(q, bankId, idx)).join('')}
    </div>
    ${questions.length > 50 ? `
    <button class="btn btn-block mt-2" id="loadMoreBtn">加载更多 (已显示 50 / ${questions.length})</button>
    ` : ''}
    `}

    <div class="card mt-4" style="border-color:var(--color-danger-light);">
      <div class="row between">
        <div>
          <div class="fw-600" style="color:var(--color-danger);">删除题库</div>
          <div class="text-sm text-muted">删除后无法恢复</div>
        </div>
        <button class="btn btn-danger" id="deleteBankBtn">删除</button>
      </div>
    </div>
  `);

  $('#editBankBtn').addEventListener('click', () => location.hash = '#/bank/' + bankId + '/edit');
  $('#practiceBtn').addEventListener('click', () => location.hash = '#/practice/' + bankId);
  $('#examBtn').addEventListener('click', () => location.hash = '#/exam/' + bankId);
  $('#addQuestionBtn').addEventListener('click', () => location.hash = '#/bank/' + bankId + '/question/new');
  $('#importQuestionBtn').addEventListener('click', () => location.hash = '#/bank/' + bankId + '/import');
  $('#exportBankBtn').addEventListener('click', () => {
    downloadFile(`${bank.name}.json`, JSON.stringify(bank, null, 2));
    toast('题库已导出');
  });
  $('#deleteBankBtn').addEventListener('click', async () => {
    const ok = await confirm({ title: '删除题库?', message: `确定要删除题库「${bank.name}」吗?该题库下所有题目、错题标记和历史记录都会清除。`, danger: true, okText: '删除' });
    if (!ok) return;
    // 用户主动删除 C3 题库时记录标记,启动时不再自动恢复
    if (bankId.startsWith('bank-c3-')) {
      localStorage.setItem('c3-bank-removed', '1');
    }
    store.deleteBank(bankId);
    toast('已删除');
    location.hash = '#/bank';
  });

  const loadMoreBtn = $('#loadMoreBtn');
  if (loadMoreBtn) {
    let shown = 50;
    loadMoreBtn.addEventListener('click', () => {
      const container = $('#questionListContainer');
      const next = Math.min(shown + 100, questions.length);
      container.insertAdjacentHTML('beforeend',
        questions.slice(shown, next).map((q, idx) => renderQuestionRow(q, bankId, shown + idx)).join(''));
      shown = next;
      if (shown >= questions.length) {
        loadMoreBtn.remove();
      } else {
        loadMoreBtn.textContent = `加载更多 (已显示 ${shown} / ${questions.length})`;
      }
      // 给新增的行绑定事件
      container.querySelectorAll('[data-edit-q]:not([data-bound])').forEach(el => {
        el.dataset.bound = '1';
        el.addEventListener('click', () => location.hash = '#/bank/' + bankId + '/question/' + el.dataset.editQ);
      });
      container.querySelectorAll('[data-del-q]:not([data-bound])').forEach(el => {
        el.dataset.bound = '1';
        el.addEventListener('click', async () => {
          const ok = await confirm({ title: '删除题目?', message: '确定删除该题目?', danger: true, okText: '删除' });
          if (!ok) return;
          store.deleteQuestion(bankId, el.dataset.delQ);
          toast('已删除');
          renderBankDetail(bankId);
        });
      });
    });
  }

  document.querySelectorAll('[data-edit-q]').forEach(el => {
    el.addEventListener('click', () => location.hash = '#/bank/' + bankId + '/question/' + el.dataset.editQ);
  });
  document.querySelectorAll('[data-del-q]').forEach(el => {
    el.addEventListener('click', async () => {
      const ok = await confirm({ title: '删除题目?', message: '确定删除该题目?', danger: true, okText: '删除' });
      if (!ok) return;
      store.deleteQuestion(bankId, el.dataset.delQ);
      toast('已删除');
      renderBankDetail(bankId);
    });
  });
}

function renderQuestionRow(q, bankId, idx) {
  const origLabel = originalNoLabel(q);
  return `
    <div class="question-item">
      <div class="q-meta">
        <span class="tag-gray tag">${TYPE_ICONS[q.type]} ${TYPE_LABELS[q.type]}</span>
        <span>#${idx + 1}${origLabel ? ' · ' + origLabel : ''}</span>
        ${q.difficulty ? `<span>难度 ${'★'.repeat(q.difficulty)}</span>` : ''}
      </div>
      <div class="q-body">${escapeHtml(q.stem.slice(0, 80))}${q.stem.length > 80 ? '...' : ''}</div>
      ${q.tags?.length ? `<div class="q-tags">${q.tags.map(t => `<span class="tag-gray tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="q-actions">
        <button class="q-action-btn" data-edit-q="${q.id}">编辑</button>
        <button class="q-action-btn danger" data-del-q="${q.id}">删除</button>
      </div>
    </div>
  `;
}

// =====================
// 新建/编辑题库
// =====================

function renderBankEdit(bankId) {
  const bank = bankId ? store.getBank(bankId) : null;
  const html = `
    <form>
      <div class="form-row">
        <label class="field-label">题库名称 *</label>
        <input type="text" name="name" required value="${escapeHtml(bank?.name || '')}" placeholder="例如:计算机基础知识" />
      </div>
      <div class="form-row">
        <label class="field-label">描述</label>
        <textarea name="description" rows="2" placeholder="可选">${escapeHtml(bank?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <label class="field-label">标签 (英文逗号分隔)</label>
        <input type="text" name="tags" value="${escapeHtml((bank?.tags || []).join(', '))}" placeholder="例如: 入门, 必考" />
      </div>
    </form>
  `;
  formModal({
    title: bankId ? '编辑题库' : '新建题库',
    html,
    onMount: (form, submit) => {
      if (submit) {
        const name = form.name.value.trim();
        if (!name) { toast('请填写题库名称', 1500); return false; }
      }
    }
  }).then(data => {
    if (!data) return;
    const newBank = {
      id: bankId || 'bank-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: data.name,
      description: data.description || '',
      tags: data.tags.split(',').map(s => s.trim()).filter(Boolean),
      questions: bank?.questions || []
    };
    store.upsertBank(newBank);
    toast(bankId ? '已更新' : '已创建');
    if (bankId) location.hash = '#/bank/' + bankId;
    else location.hash = '#/bank/' + newBank.id;
  });
}

// =====================
// 新建/编辑题目
// =====================

function renderQuestionEdit(bankId, qid) {
  const bank = store.getBank(bankId);
  if (!bank) { setView(`<div class="empty">题库不存在</div>`); return; }
  const q = qid ? bank.questions.find(x => x.id === qid) : null;
  const isNew = !q;
  const type = q?.type || 'single';

  const html = `
    <form>
      <div class="form-row">
        <label class="field-label">题型 *</label>
        <select name="type" id="qType">
          ${Object.entries(TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${type === k ? 'selected' : ''}>${TYPE_ICONS[k]} ${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="field-label">题干 *</label>
        <textarea name="stem" rows="3" required placeholder="题目内容,填空题用 ___ 表示空">${escapeHtml(q?.stem || '')}</textarea>
      </div>

      <div class="form-row" id="optionsBlock">
        <label class="field-label">选项 (每行一个,格式: A. 内容 或 直接内容)</label>
        <textarea name="options" rows="5" placeholder="A. 选项一\nB. 选项二\nC. 选项三\nD. 选项四">${escapeHtml((q?.options || []).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n'))}</textarea>
      </div>

      <div class="form-row" id="answerBlock">
        <label class="field-label">答案 *</label>
        <div id="answerInputArea">
          ${renderAnswerInput(q, type)}
        </div>
      </div>

      <div class="form-row">
        <label class="field-label">解析 (可选)</label>
        <textarea name="explanation" rows="2">${escapeHtml(q?.explanation || '')}</textarea>
      </div>

      <div class="form-row">
        <label class="field-label">标签 (逗号分隔)</label>
        <input type="text" name="tags" value="${escapeHtml((q?.tags || []).join(', '))}" />
      </div>

      <div class="form-row">
        <label class="field-label">难度 (1-5)</label>
        <input type="number" name="difficulty" min="1" max="5" value="${q?.difficulty || 1}" />
      </div>
    </form>
  `;

  formModal({
    title: isNew ? '添加题目' : '编辑题目',
    html,
    onMount: (form, submit) => {
      const typeSelect = form.querySelector('#qType');
      const answerArea = form.querySelector('#answerInputArea');
      const optionsBlock = form.querySelector('#optionsBlock');

      typeSelect.addEventListener('change', () => {
        const t = typeSelect.value;
        optionsBlock.style.display = (t === 'judge' || t === 'fill') ? 'none' : '';
        answerArea.innerHTML = renderAnswerInput(null, t);
      });

      // 初始化选项块可见性
      if (type === 'judge' || type === 'fill') optionsBlock.style.display = 'none';

      if (submit) {
        const t = typeSelect.value;
        const stem = form.stem.value.trim();
        if (!stem) { toast('请填写题干', 1500); return false; }
        if (t === 'fill' && !stem.includes('___')) { toast('填空题题干中需要包含 ___ 作为空位', 2000); return false; }
        if ((t === 'single' || t === 'multiple') && !form.options.value.trim()) { toast('请填写选项', 1500); return false; }

        // 校验通过 → 返回自定义数据对象
        let answer;
        if (t === 'single') {
          answer = form.querySelector('input[name="answer"]:checked')?.value;
          if (!answer) { toast('请选择答案', 1500); return false; }
        } else if (t === 'multiple') {
          answer = [...form.querySelectorAll('input[name="answerMulti"]:checked')].map(el => el.value);
          if (answer.length === 0) { toast('请至少选一个答案', 1500); return false; }
        } else if (t === 'judge') {
          const checked = form.querySelector('input[name="judge"]:checked');
          if (!checked) { toast('请选择对/错', 1500); return false; }
          answer = checked.value;
        } else if (t === 'fill') {
          answer = form.fill.value;
          if (!answer.trim()) { toast('请填写答案', 1500); return false; }
        }

        return {
          type: t,
          stem: dataSafe(form.stem.value),
          options: dataSafe(form.options.value),
          answer,
          explanation: dataSafe(form.explanation.value),
          tags: dataSafe(form.tags.value),
          difficulty: dataSafe(form.difficulty.value),
          judge: form.querySelector('input[name="judge"]:checked')?.value,
          fill: form.fill?.value || ''
        };
      }
    }
  }).then(data => {
    if (!data) return;
    const t = data.type;
    let options = [];
    if (t === 'single' || t === 'multiple') {
      options = (data.options || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => {
        const m = s.match(/^[A-Z]\.\s*(.+)$/);
        return m ? m[1] : s;
      });
    }
    let answer;
    if (t === 'single') {
      answer = data.answer;
    } else if (t === 'multiple') {
      answer = data.answer;
    } else if (t === 'judge') {
      answer = data.judge === 'true';
    } else if (t === 'fill') {
      answer = data.fill.split('||').map(s => s.trim());
    }

    const newQ = {
      id: qid || ('q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      type: t,
      stem: data.stem,
      options,
      answer,
      explanation: data.explanation || '',
      tags: data.tags.split(',').map(s => s.trim()).filter(Boolean),
      difficulty: Math.max(1, Math.min(5, parseInt(data.difficulty) || 1))
    };
    if (isNew) store.addQuestion(bankId, newQ);
    else store.updateQuestion(bankId, newQ);
    toast(isNew ? '已添加' : '已更新');
    location.hash = '#/bank/' + bankId;
  });
}

function dataSafe(v) { return v == null ? '' : v; }

function renderAnswerInput(q, type) {
  switch (type) {
    case 'single': {
      const optCount = q?.options?.length || 4;
      let opts = '';
      for (let i = 0; i < Math.max(4, optCount); i++) {
        const letter = String.fromCharCode(65 + i);
        opts += `<label style="display:inline-block;margin-right:14px;"><input type="radio" name="answer" value="${letter}" ${q?.answer === letter ? 'checked' : (i === 0 && !q ? 'checked' : '')}/> ${letter}</label>`;
      }
      return opts;
    }
    case 'multiple': {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      return letters.map(l =>
        `<label style="display:inline-block;margin-right:14px;"><input type="checkbox" name="answerMulti" value="${l}" ${q?.answer?.includes(l) ? 'checked' : ''}/> ${l}</label>`
      ).join('');
    }
    case 'judge':
      return `<label style="margin-right:20px;"><input type="radio" name="judge" value="true" ${q?.answer === true ? 'checked' : ''}/> ✓ 对</label>
              <label><input type="radio" name="judge" value="false" ${q?.answer === false ? 'checked' : ''}/> ✗ 错</label>`;
    case 'fill':
      return `<input type="text" name="fill" placeholder="多个空用 || 分隔,例如: 唐 || 李白" value="${escapeHtml((q?.answer || []).join(' || '))}" />`;
  }
}

// =====================
// 批量导入题目
// =====================

function renderImport(bankId) {
  setView(`
    <div class="card">
      <div class="fw-600 mb-2">批量导入题目</div>
      <div class="text-sm text-muted">粘贴一个包含 questions 数组的 JSON,或者上传 JSON 文件。每道题至少需要 type 和 stem 和 answer。</div>
    </div>
    <div class="card">
      <textarea id="importArea" rows="10" placeholder='粘贴 JSON,例如: { "questions": [...] }'></textarea>
      <div class="row gap-2 mt-3">
        <button class="btn btn-block" id="pickFileBtn">📁 选择文件</button>
        <button class="btn btn-primary btn-block" id="importBtn">导入</button>
      </div>
    </div>
  `);

  $('#pickFileBtn').addEventListener('click', () => {
    pickFile().then(t => { if (t) $('#importArea').value = t; });
  });
  $('#importBtn').addEventListener('click', () => {
    const text = $('#importArea').value.trim();
    if (!text) { toast('请输入 JSON', 1500); return; }
    try {
      const obj = JSON.parse(text);
      const questions = obj.questions || obj;
      if (!Array.isArray(questions)) throw new Error('需要包含 questions 数组');
      questions.forEach(q => {
        const newQ = {
          id: q.id || ('q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
          type: q.type || 'single',
          stem: q.stem || '',
          options: q.options || [],
          answer: q.answer,
          explanation: q.explanation || '',
          tags: q.tags || [],
          difficulty: q.difficulty || 1
        };
        store.addQuestion(bankId, newQ);
      });
      toast(`已导入 ${questions.length} 道题`);
      location.hash = '#/bank/' + bankId;
    } catch (e) {
      toast('导入失败: ' + e.message, 2500);
    }
  });
}