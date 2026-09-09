// =====================
// 主入口 + 路由
// =====================

import * as store from './storage.js?v=20260909o';
import { $, setView, setTitle, toast } from './ui.js?v=20260909o';
import { renderHome } from './pages/home.js?v=20260909o';
import { renderBank } from './pages/bank.js?v=20260909o';
import { renderPractice } from './pages/practice.js?v=20260909o';
import { renderExam } from './pages/exam.js?v=20260909o';
import { renderStats } from './pages/stats.js?v=20260909o';
import { renderSettings } from './pages/settings.js?v=20260909o';
import { C3_BANKS } from './data/c3-bank.js';

const routes = {
  home: { title: '刷题助手', render: renderHome },
  bank: { title: '题库管理', render: renderBank },
  practice: { title: '练习', render: renderPractice },
  exam: { title: '模拟考试', render: renderExam },
  stats: { title: '统计', render: renderStats },
  settings: { title: '设置', render: renderSettings }
};

function getRouteName() {
  const hash = location.hash.replace(/^#\/?/, '');
  return hash.split('/')[0] || 'home';
}

function navigate() {
  const name = getRouteName();
  const route = routes[name] || routes.home;
  setTitle(route.title);

  // 切换底部 tab 激活态
  $$('.tab').forEach(el => el.classList.toggle('active', el.dataset.route === name));

  // 返回按钮:仅在深路径时显示
  const isDeep = location.hash.includes('/', location.hash.indexOf(name) + name.length);
  $('#backBtn').classList.toggle('hidden', !isDeep);

  try {
    route.render(location.hash);
  } catch (e) {
    console.error('[render]', e);
    setView(`<div class="empty"><div class="ico">⚠️</div><p>页面渲染出错<br><span style="color:#94a3b8;">${e.message}</span></p></div>`);
  }
}

function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

window.addEventListener('hashchange', navigate);

// 底部 tab 点击
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) {
    e.preventDefault();
    const route = tab.dataset.route;
    location.hash = '#/' + route;
  }
});

// 返回按钮
$('#backBtn').addEventListener('click', () => history.back());

// 设置按钮
$('#settingsBtn').addEventListener('click', () => location.hash = '#/settings');

// =====================
// 启动:首次加载示例题库(如果没有题库的话)
// =====================

async function bootstrap() {
  const data = store.getAll();
  if (data.banks.length === 0) {
    try {
      const resp = await fetch('./data/sample-questions.json');
      if (resp.ok) {
        const txt = await resp.text();
        store.importJson(txt, { merge: false });
        console.log('[bootstrap] 示例题库已加载');
      }
    } catch (e) {
      console.warn('[bootstrap] 加载示例题库失败(可能因为 file:// 协议)', e);
    }
  }

  // C3 安全考核题库(第六批 2965 题,单选+多选+判断合并为一个题库,按官方原始顺序):
  // 数据直接打包为 JS 模块(不走 fetch),检测题库真实存在,缺失即导入
  // 旧版的三个分题型题库(bank-c3-single/multiple/judge)自动迁移清理,错题/收藏记录保留(题目 id 不变)
  // 用户主动删除后记录 c3-bank-removed 标记,不再自动恢复
  try {
    const hasAll = store.listBanks().some(b => b.id === 'bank-c3-all');
    const c3Removed = localStorage.getItem('c3-bank-removed');
    if (!hasAll && !c3Removed) {
      // 先导入合并题库(题目 id 与旧版一致,错题/收藏记录无缝衔接),再清理旧题库
      const n = store.importJson(JSON.stringify(C3_BANKS), { merge: true });
      ['bank-c3-single', 'bank-c3-multiple', 'bank-c3-judge'].forEach(id => {
        if (store.listBanks().some(b => b.id === id)) store.deleteBank(id);
      });
      const ok = store.listBanks().some(b => b.id === 'bank-c3-all');
      console.log(`[bootstrap] C3 题库(合并版)导入: ${ok ? '成功' : '失败'}, 当前 ${n} 个题库`);
      if (ok) toast('已导入 C3 安全考核题库·合并版(2965 题)', 2500);
    }
  } catch (e) {
    console.warn('[bootstrap] C3 题库导入失败', e);
    toast('C3 题库导入失败:' + e.message, 3000);
  }

  navigate();
}

bootstrap();