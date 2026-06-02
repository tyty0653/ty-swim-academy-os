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
  'Setup Checklist': '设置清单',
  'Step': '步骤',
  'Done': '完成',
  'Add coach': '新增教练',
  'Add customer/family': '新增客户/家庭',
  'Create class/group': '创建班级/小组',
  'Create package': '创建配套',
  'Schedule first lesson': '安排第一堂课',
  'Test coach submission': '测试教练提交记录',
  'Approve lesson': '批准课程',
  'Review Lessons': '审核课程',
  'Today and This Week': '今日与本周课程',
  'No scheduled lessons in this view.': '这里暂时没有已安排的课程。',
  'No upcoming assigned lessons.': '暂无即将到来的指派课程。',
  'A simple daily view for lessons, coach submissions, schedule changes, and renewal follow-ups.': '用一个简单页面查看今日课程、教练提交、改期提醒和续课跟进。',
  'Know what is happening today.': '快速查看今天的课程安排。',
  'Approve or request edits from coaches.': '审核教练提交，批准或要求修改。',
  'Coach date/time changes to check.': '查看教练更改的日期或时间。',
  '1 lesson left or expiring in 7 days.': '剩 1 堂课或 7 天内到期。',
  'Reschedule alerts': '改期提醒',
  'Renewals soon': '续课提醒',
  'Review coach submissions': '审核教练提交',
  'Check reschedules': '检查改期',
  'Handle cancelled lessons': '处理取消课程',
  'Fix missing required photos': '补齐必需照片',
  'Follow up renewal reminders': '跟进续课提醒',
  'Plan replacement lessons': '安排补课',
  'Clean missing data': '整理缺漏资料',
  'Nothing urgent right now': '目前没有紧急事项',
  'No review, renewal, replacement, or missing data items need action.': '暂无需要处理的审核、续课、补课或资料缺漏。',
  'No lessons found': '没有找到课程',
  'Time TBC': '时间待确认',
  'Venue not set': '地点未设置',
  'Payments, payroll, expenses, and accounting summary.': '收款、教练工资、支出和月度记录摘要。',
  'Simple owner and coach guide for daily use.': '给负责人和教练的日常使用指南。',
  'TY Swim Level 1-6 syllabus and student progress.': 'TY Swim Level 1-6 教学大纲与学生进度。',
  'Check whether the OS is ready and see what to fix first.': '检查系统是否准备好，并查看优先要修复的事项。',
  'Check your coach account, assigned lessons, students, venues, and pay access.': '检查你的教练账号、指派课程、学生、地点和工资权限。',
  'Read-only history of important Admin and system actions.': '查看重要管理操作和系统记录，只读不可修改。',
  'Bring in old Google Sheet CSV data.': '导入旧 Google Sheet 的 CSV 资料。',
  'Find missing names, address, age, consent, coach, and proof records.': '找出缺少姓名、地址、年龄、同意书、教练或证明的资料。',
  'Monthly lesson, renewal, payment, expense, and payroll exports.': '导出每月课程、续课、收款、支出和工资记录。',
  'Users, coaches, rates, and system settings.': '用户、教练、工资率和系统设置。',
  'Detailed customer list route.': '打开客户/家庭详细列表。',
  'Venue list route.': '打开地点列表。',
  'Class/group list route.': '打开班级/小组列表。',
  'Package list route.': '打开配套列表。',
  'Detailed lesson history route.': '打开课程历史记录。',
  'Export All Data JSON': '导出全部资料 JSON',
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
