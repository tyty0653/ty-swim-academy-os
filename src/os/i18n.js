const STORAGE_KEY = 'tyswim-os-language';

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

const zh = {
  'Admin / Coach Login': '管理员 / 教练登录',
  'Sign in': '登录',
  'Signing in...': '登录中...',
  'Email': '邮箱',
  'Password': '密码',
  'Today': '今日',
  'Students': '学生',
  'Schedule': '课程安排',
  'Review': '审核',
  'Money': '财务',
  'More': '更多',
  'My Schedule': '我的课程',
  'My Students': '我的学生',
  'My Pay': '我的工资',
  'Help Guide': '使用指南',
  'Setup Check': '系统检查',
  'My Account Check': '我的账号检查',
  'Levels & Progress': '等级与进度',
  'Audit Logs': '操作记录',
  'Settings': '设置',
  'Reports': '报告',
  'Data Cleanup': '资料整理',
  'CSV Import': 'CSV 导入',
  'Add Family': '新增家庭',
  'Add Student': '新增学生',
  'Add Student / Family': '新增学生 / 家庭',
  'Add Venue': '新增地点',
  'Add Class': '新增班级',
  'Add Package': '新增配套',
  'Schedule Lesson': '安排课程',
  'Submit Record': '提交上课记录',
  'Submit / Open': '提交 / 打开',
  'Update Progress': '更新进度',
  'Approve': '批准',
  'Request Edit': '要求修改',
  'Reject': '拒绝',
  'Save': '保存',
  'Cancel': '取消',
  'Edit': '编辑',
  'Delete': '删除',
  'Sign out': '登出',
  'Export': '导出',
  'Import': '导入',
  'Open Profile': '打开档案',
  'Open': '打开',
  'Open Today': '打开今日',
  'Language': '语言',
  'Account': '账号',
  'Help & Setup': '帮助与设置',
  'Admin Tools': '管理员工具',
  'Records': '记录',
  'System': '系统',
  'Current user': '当前用户',
  'Role': '身份',
  'Admin': '管理员',
  'Coach': '教练',
  'Scheduled': '已安排',
  'Pending Review': '待审核',
  'Approved': '已批准',
  'Needs Edit': '需要修改',
  'Cancelled': '已取消',
  'Rescheduled': '已改期',
  'Rejected': '已拒绝',
  'Archived': '已归档',
  'Paid': '已付款',
  'Unpaid': '未付款',
  'Active': '使用中',
  'Inactive': '停用',
  'Expired': '已到期',
  'Void': '已作废',
  'Today’s lessons': '今日课程',
  "Today's lessons": '今日课程',
  'This week': '本周',
  'Pending records': '待提交记录',
  'Expected payroll': '预计工资',
  'Approved lessons': '已批准课程',
  'Paid items': '已付款项目',
  'Safety alert': '安全提醒',
  'Current focus': '当前重点',
  'Progress update': '进度更新',
  'No action needed': '无需操作',
  'Approved lesson': '已批准课程',
  'Pending review': '待审核',
  'Next Actions': '下一步',
  'Next actions': '下一步',
  'Missing data': '资料不完整',
  'Low remaining lessons': '剩余课数不足',
  'Expiring soon': '即将到期',
  'Package remaining': '剩余课数',
  'Coach payroll': '教练工资',
  'Expenses': '支出',
  'Payments': '收款',
  'No lessons today': '今日没有课程',
  'No pending review': '没有待审核记录',
  'No matching students': '没有符合的学生',
  'No payroll yet': '还没有工资记录',
  'WhatsApp': 'WhatsApp',
  'Map': '地图',
  'No WhatsApp': '没有 WhatsApp',
  'No map': '没有地图',
  'Photo required today': '今日需要照片',
  'Approved — no further action needed.': '已批准，无需进一步操作。',
};

export function normalizeLanguage(value) {
  return value === 'zh' ? 'zh' : 'en';
}

export function getStoredLanguage() {
  try {
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'en';
  }
}

let runtimeLanguage = getStoredLanguage();

export function getRuntimeLanguage() {
  return runtimeLanguage;
}

export function setStoredLanguage(language) {
  runtimeLanguage = normalizeLanguage(language);
  try {
    window.localStorage.setItem(STORAGE_KEY, runtimeLanguage);
  } catch {
    // localStorage can be unavailable in private browser modes.
  }
  return runtimeLanguage;
}

export function tx(value, fallback = value, language = runtimeLanguage) {
  if (language !== 'zh') return fallback || value || '';
  return zh[value] || zh[fallback] || fallback || value || '';
}

export function statusText(value, fallback = value, language = runtimeLanguage) {
  const readable = fallback || String(value || '').replaceAll('_', ' ');
  const title = readable
    .split(' ')
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');
  return tx(title, title, language);
}
