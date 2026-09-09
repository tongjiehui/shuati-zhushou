// =====================
// 数据存储层
// localStorage 封装 + 数据模型
// =====================

const STORAGE_KEY = 'quiz-app-v1';

const DEFAULT_DATA = {
  banks: [],         // 题库列表
  records: [],       // 历史记录（练习 + 考试）
  wrongSet: [],      // 错题 id 集合（带时间）
  favoriteSet: [],   // 收藏 id 集合
  settings: {
    fillCaseSensitive: false,  // 填空是否大小写敏感
    dailyGoal: 20,             // 每日目标题数
    lastStudyDate: null,       // 上次学习日期
    todayCount: 0              // 今日已答
  }
};

let _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
  } catch (e) {
    console.warn('[storage] 读取失败,使用默认数据', e);
    _cache = { ...DEFAULT_DATA };
  }
  return _cache;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
  } catch (e) {
    console.error('[storage] 保存失败', e);
    alert('数据保存失败,可能存储空间已满');
  }
}

export function resetAll() {
  _cache = { ...DEFAULT_DATA };
  save();
}

export function getAll() { return load(); }

// =====================
// 题库 (banks)
// =====================

export function listBanks() {
  return load().banks;
}

export function getBank(id) {
  return load().banks.find(b => b.id === id);
}

export function upsertBank(bank) {
  const data = load();
  const idx = data.banks.findIndex(b => b.id === bank.id);
  if (idx >= 0) data.banks[idx] = bank;
  else data.banks.push(bank);
  save();
}

export function deleteBank(id) {
  const data = load();
  data.banks = data.banks.filter(b => b.id !== id);
  // 清理该题库下错题 / 收藏 / 记录
  const allQids = data.banks.flatMap(b => b.questions.map(q => q.id));
  data.wrongSet = data.wrongSet.filter(w => allQids.includes(w.questionId));
  data.favoriteSet = data.favoriteSet.filter(f => allQids.includes(f.questionId));
  data.records = data.records.filter(r => allQids.length && r.questionIds?.some(qid => allQids.includes(qid)));
  save();
}

export function addQuestion(bankId, question) {
  const bank = getBank(bankId);
  if (!bank) return;
  if (!bank.questions) bank.questions = [];
  bank.questions.push(question);
  upsertBank(bank);
}

export function updateQuestion(bankId, question) {
  const bank = getBank(bankId);
  if (!bank) return;
  const idx = bank.questions.findIndex(q => q.id === question.id);
  if (idx >= 0) bank.questions[idx] = question;
  upsertBank(bank);
}

export function deleteQuestion(bankId, questionId) {
  const bank = getBank(bankId);
  if (!bank) return;
  bank.questions = bank.questions.filter(q => q.id !== questionId);
  upsertBank(bank);
  const data = load();
  data.wrongSet = data.wrongSet.filter(w => w.questionId !== questionId);
  data.favoriteSet = data.favoriteSet.filter(f => f.questionId !== questionId);
  save();
}

export function getQuestion(bankId, questionId) {
  const bank = getBank(bankId);
  return bank?.questions.find(q => q.id === questionId);
}

// =====================
// 错题 / 收藏
// =====================

export function isWrong(questionId) {
  return load().wrongSet.some(w => w.questionId === questionId);
}

export function isFavorite(questionId) {
  return load().favoriteSet.some(f => f.questionId === questionId);
}

export function toggleWrong(questionId) {
  const data = load();
  const idx = data.wrongSet.findIndex(w => w.questionId === questionId);
  if (idx >= 0) data.wrongSet.splice(idx, 1);
  else data.wrongSet.unshift({ questionId, addedAt: Date.now() });
  save();
  return idx < 0; // 返回最新状态
}

export function toggleFavorite(questionId) {
  const data = load();
  const idx = data.favoriteSet.findIndex(f => f.questionId === questionId);
  if (idx >= 0) data.favoriteSet.splice(idx, 1);
  else data.favoriteSet.unshift({ questionId, addedAt: Date.now() });
  save();
  return idx < 0;
}

export function getWrongQuestions() {
  const data = load();
  const qMap = new Map();
  data.banks.forEach(b => b.questions.forEach(q => qMap.set(q.id, { ...q, bankId: b.id, bankName: b.name })));
  return data.wrongSet.map(w => qMap.get(w.questionId)).filter(Boolean);
}

export function getFavoriteQuestions() {
  const data = load();
  const qMap = new Map();
  data.banks.forEach(b => b.questions.forEach(q => qMap.set(q.id, { ...q, bankId: b.id, bankName: b.name })));
  return data.favoriteSet.map(f => qMap.get(f.questionId)).filter(Boolean);
}

// =====================
// 历史记录
// =====================

export function addRecord(record) {
  const data = load();
  data.records.unshift({
    ...record,
    id: 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    finishedAt: Date.now()
  });
  // 限制最多保留 200 条
  if (data.records.length > 200) data.records = data.records.slice(0, 200);
  save();
}

export function listRecords(mode = null) {
  const recs = load().records;
  return mode ? recs.filter(r => r.mode === mode) : recs;
}

export function deleteRecord(id) {
  const data = load();
  data.records = data.records.filter(r => r.id !== id);
  save();
}

// =====================
// 设置 / 每日统计
// =====================

export function getSettings() { return load().settings; }
export function updateSettings(patch) {
  const data = load();
  data.settings = { ...data.settings, ...patch };
  save();
}

export function tickTodayCount(n = 1) {
  const data = load();
  const today = new Date().toISOString().slice(0, 10);
  if (data.settings.lastStudyDate !== today) {
    data.settings.lastStudyDate = today;
    data.settings.todayCount = 0;
  }
  data.settings.todayCount += n;
  save();
}

// =====================
// 导入 / 导出
// =====================

export function exportAll() {
  return JSON.stringify(load(), null, 2);
}

export function importJson(jsonStr, { merge = false } = {}) {
  const obj = JSON.parse(jsonStr);
  const data = load();

  // 兼容两种格式:
  // 1) 顶层就是完整结构 { banks, records, ... }
  // 2) 仅有 banks 数组
  const banks = Array.isArray(obj) ? obj : (obj.banks || []);
  if (!Array.isArray(banks)) throw new Error('题库格式不正确');

  if (merge) {
    // 合并: 同 id 覆盖,新增追加
    const map = new Map(data.banks.map(b => [b.id, b]));
    banks.forEach(b => map.set(b.id, b));
    data.banks = [...map.values()];
  } else {
    // 替换
    data.banks = banks;
  }

  // 顶层其它字段(可选覆盖)
  if (obj.records) data.records = obj.records;
  if (obj.settings) data.settings = { ...data.settings, ...obj.settings };

  save();
  return data.banks.length;
}

export function importBankFromJson(jsonStr) {
  // 单个题库的精简格式
  const obj = JSON.parse(jsonStr);
  if (!obj.name || !Array.isArray(obj.questions)) {
    throw new Error('题库 JSON 至少需要 name 和 questions 字段');
  }
  const bank = {
    id: 'bank-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: obj.name,
    description: obj.description || '',
    tags: obj.tags || [],
    questions: (obj.questions || []).map(q => ({
      id: q.id || ('q-' + Math.random().toString(36).slice(2, 10)),
      type: q.type || 'single',
      stem: q.stem || '',
      options: q.options || [],
      answer: q.answer,
      explanation: q.explanation || '',
      tags: q.tags || [],
      difficulty: q.difficulty || 1
    }))
  };
  upsertBank(bank);
  return bank;
}