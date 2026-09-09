// =====================
// UI 工具: Toast / Modal / Confirm
// =====================

let toastTimer = null;
export function toast(msg, duration = 1500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

export function confirm({ title = '确认', message = '', okText = '确定', cancelText = '取消', danger = false } = {}) {
  return new Promise(resolve => {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = `<p style="margin:0;color:var(--color-text-2);">${message}</p>`;
    const okBtn = document.getElementById('modalOk');
    okBtn.textContent = okText;
    okBtn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    const cancelBtn = document.getElementById('modalCancel');
    cancelBtn.textContent = cancelText;
    modal.classList.remove('hidden');

    const close = (v) => {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', okHandler);
      cancelBtn.removeEventListener('click', cancelHandler);
      resolve(v);
    };
    const okHandler = () => close(true);
    const cancelHandler = () => close(false);
    okBtn.addEventListener('click', okHandler);
    cancelBtn.addEventListener('click', cancelHandler);
  });
}

/**
 * 弹出一个表单式模态框,返回用户填写内容
 * @param {object} config
 *   - title
 *   - html: 表单 HTML
 *   - onMount(formEl): 挂载后回调(用于绑定事件)
 *   - okText / cancelText
 */
export function formModal({ title, html, onMount, okText = '保存', cancelText = '取消' }) {
  return new Promise(resolve => {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = html;
    const okBtn = document.getElementById('modalOk');
    okBtn.textContent = okText;
    const cancelBtn = document.getElementById('modalCancel');
    cancelBtn.textContent = cancelText;
    modal.classList.remove('hidden');

    const content = document.getElementById('modalContent');
    const formEl = content.querySelector('form') || content;
    onMount?.(formEl);

    const close = (v) => {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', ok);
      cancelBtn.removeEventListener('click', cancel);
      resolve(v);
    };
    const ok = () => {
      const result = onMount?.(formEl, true);
      // onMount 返回 false 表示校验失败,不关闭
      if (result === false) return;
      // 如果 onMount 返回对象,则用它(自定义数据)
      // 否则自动收集 name 字段
      let data;
      if (result && typeof result === 'object') {
        data = result;
      } else {
        data = {};
        formEl.querySelectorAll('[name]').forEach(el => {
          if (el.type === 'checkbox') data[el.name] = el.checked;
          else if (el.type === 'radio') {
            if (el.checked) data[el.name] = el.value;
          }
          else data[el.name] = el.value;
        });
      }
      close(data);
    };
    const cancel = () => close(null);

    okBtn.addEventListener('click', ok);
    cancelBtn.addEventListener('click', cancel);
  });
}

// =====================
// 渲染工具
// =====================

export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

// 简单的 diff 工具:替换容器内容
export function setView(html) {
  $('#view').innerHTML = html;
}

export function setTitle(t) { $('#pageTitle').textContent = t; }

// 时间格式化
export function fmtDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtRelative(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`;
  return fmtDate(ts);
}

// 文件下载工具
export function downloadFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickFile(accept = '.json') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    };
    input.click();
  });
}

// 计时器格式化
export function fmtTimer(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}