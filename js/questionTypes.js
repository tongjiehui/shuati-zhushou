// =====================
// 题型与判分逻辑
// =====================

export const TYPE_LABELS = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  fill: '填空题'
};

export const TYPE_ICONS = {
  single: '🔘',
  multiple: '☑️',
  judge: '⚖️',
  fill: '✍️'
};

/**
 * 判分
 * @returns { correct: boolean, partial?: boolean }
 */
export function checkAnswer(question, userAnswer, { fillCaseSensitive = false } = {}) {
  if (userAnswer === undefined || userAnswer === null) return { correct: false };

  switch (question.type) {
    case 'single':
      return { correct: userAnswer === question.answer };

    case 'multiple': {
      const u = Array.isArray(userAnswer) ? userAnswer : [];
      const a = Array.isArray(question.answer) ? question.answer : [];
      const sorted = arr => [...arr].sort().join(',');
      const correct = sorted(u) === sorted(a);
      // 包含部分正确选项但不完全匹配
      const partial = !correct && u.length > 0 &&
        u.every(x => a.includes(x)) && a.length > u.length;
      return { correct, partial };
    }

    case 'judge':
      return { correct: Boolean(userAnswer) === Boolean(question.answer) };

    case 'fill': {
      const u = Array.isArray(userAnswer) ? userAnswer :
                typeof userAnswer === 'string' ? [userAnswer] : [];
      const a = Array.isArray(question.answer) ? question.answer : [question.answer];
      if (u.length !== a.length) return { correct: false };
      const norm = fillCaseSensitive ? (s => s.trim()) : (s => s.trim().toLowerCase());
      const allCorrect = a.every((ans, i) => norm(u[i] || '') === norm(ans));
      return { correct: allCorrect };
    }

    default:
      return { correct: false };
  }
}

/**
 * 把题目题干里的 ___ 转成可填空位置(用于填空题)
 * 支持"一个空"和"多个空"。
 */
export function parseFillStem(stem) {
  // 匹配 ___ 或者连续 ____
  const parts = stem.split(/_{2,}/);
  return {
    parts,        // ['xxx', 'yyy', 'zzz']
    blankCount: parts.length - 1
  };
}

/**
 * 把题干渲染成带 <input> 的 HTML 片段(用于填空题作答)。
 */
export function renderFillInputs(stem, answers = []) {
  const { parts, blankCount } = parseFillStem(stem);
  if (blankCount === 0) {
    return { html: stem, blankCount: 0 };
  }
  let html = parts[0];
  for (let i = 0; i < blankCount; i++) {
    html += `<input type="text" class="blank-input" data-blank="${i}" value="${answers[i] || ''}" autocomplete="off" />`;
    html += parts[i + 1] || '';
  }
  return { html, blankCount };
}

/**
 * 从 DOM 中收集填空题作答
 */
export function collectFillAnswers(rootEl) {
  const inputs = rootEl.querySelectorAll('input.blank-input');
  return Array.from(inputs).map(i => i.value);
}

/**
 * 标准化答案(用于显示)
 */
export function formatAnswer(question) {
  const a = question.answer;
  switch (question.type) {
    case 'single': return String(a);
    case 'multiple': return (a || []).join(', ');
    case 'judge': return a ? '对' : '错';
    case 'fill':
      return Array.isArray(a) ? a.join(' | ') : String(a);
    default: return String(a);
  }
}

export function formatUserAnswer(question, userAnswer) {
  if (userAnswer === undefined || userAnswer === null) return '(未作答)';
  switch (question.type) {
    case 'single': return userAnswer ? String(userAnswer) : '(未作答)';
    case 'multiple': return (userAnswer || []).join(', ') || '(未作答)';
    case 'judge': return userAnswer === undefined ? '(未作答)' : (userAnswer ? '对' : '错');
    case 'fill': return Array.isArray(userAnswer) ? userAnswer.join(' | ') : userAnswer;
    default: return String(userAnswer);
  }
}

/**
 * 题目统计(组卷时用)
 */
export function countByType(questions) {
  const c = { single: 0, multiple: 0, judge: 0, fill: 0 };
  questions.forEach(q => { c[q.type] = (c[q.type] || 0) + 1; });
  return c;
}

/**
 * 解析 C3 题库题目的官方原始题号。
 * C3 题目 id 形如 q-c3-s-123(单选) / q-c3-m-45(多选) / q-c3-j-6(判断),
 * 其中的数字即官方题库中该题型下的原始题号(与 PDF 一致)。
 * @returns {{ typeLabel: string, num: number } | null} 非 C3 题目返回 null
 */
export function getOriginalNo(question) {
  const m = /^q-c3-([smj])-(\d+)$/.exec(question?.id || '');
  if (!m) return null;
  const typeLabel = { s: '单选题', m: '多选题', j: '判断题' }[m[1]];
  return { typeLabel, num: parseInt(m[2], 10) };
}

/**
 * 原始题号显示 HTML(加大加粗、主题色);非 C3 题目返回 ''
 * 注意:返回的是 HTML 片段,只能用于模板字符串,不要对其再做 escapeHtml
 */
export function originalNoLabel(question) {
  const o = getOriginalNo(question);
  return o ? `<span class="orig-no">原卷第 ${o.num} 题</span>` : '';
}