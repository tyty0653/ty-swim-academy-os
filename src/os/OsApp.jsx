import { useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';
import { Button, Card, DataTable, EmptySetup, Field, Input, Modal, Section, Select, StatusBadge, Textarea, Toasts } from './OsComponents.jsx';
import { adminNav, classTypes, coachNav, expenseCategories, legacyAdminRoutes, packageTypes, paymentMethods } from './osConstants.js';
import { bonusSkills, getSkillLevel, levelStatusLabels, levelStatuses, progressStatusLabels, progressStatuses, skillLevels } from './skillLevels.js';
import { derivePackageExpiry, downloadCsv, formatDate, formatMoney, getMapped, parseCsv, placeholder, todayISO } from './osUtils.js';

const allTableNames = [
  'profiles',
  'coaches',
  'customers',
  'students',
  'venues',
  'classes',
  'class_students',
  'packages',
  'package_financials',
  'recurring_schedules',
  'lessons',
  'lesson_participants',
  'lesson_photos',
  'lesson_change_logs',
  'payroll_periods',
  'payroll_items',
  'expenses',
  'consents',
  'coach_rates',
  'student_skill_profiles',
  'student_skill_progress',
  'lesson_skill_assessments',
  'import_batches',
  'audit_logs',
];

const coachTableNames = allTableNames.filter((name) => !['package_financials', 'expenses', 'import_batches', 'audit_logs'].includes(name));
const initialData = Object.fromEntries(allTableNames.map((name) => [name, []]));
const requiredStorageBuckets = ['lesson-photos', 'payment-proofs', 'expense-receipts'];

function getPathInfo() {
  const rawPath = window.location.pathname.replace(/\/$/, '') || '/dashboard';
  const path = rawPath === '/' ? '/dashboard' : rawPath;
  const parts = path.split('/').filter(Boolean);
  return {
    path,
    section: path === '/dashboard' ? 'dashboard' : parts[0] || 'dashboard',
    id: path === '/dashboard' ? '' : parts[1] || '',
  };
}

function go(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function withTimeout(promise, label, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} took too long. Please check your internet connection and Supabase settings.`)), ms);
    }),
  ]);
}

async function loadProfileForUser(userId) {
  return withTimeout(
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
    'Staff profile check'
  );
}

function getProfileIssue(profileRow, profileError) {
  if (profileError) {
    return {
      title: 'Could not load your staff profile',
      body: profileError.message || 'Supabase returned an error while loading your profile.',
    };
  }
  if (!profileRow) {
    return {
      title: 'Login succeeded, but your staff profile is missing or inactive.',
      body: 'Please contact Admin. Your Auth user exists, but there is no matching row in the profiles table.',
    };
  }
  if (!['admin', 'coach'].includes(profileRow.role)) {
    return {
      title: 'Your staff role is not valid',
      body: `The profile role is "${profileRow.role || 'empty'}". It must be either admin or coach.`,
    };
  }
  if (!profileRow.active) {
    return {
      title: 'Your staff account is inactive',
      body: 'Please contact Admin to reactivate this OS account.',
    };
  }
  return null;
}

export default function OsApp() {
  const [pathInfo, setPathInfo] = useState(getPathInfo);
  useEffect(() => {
    const update = () => setPathInfo(getPathInfo());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  if (!hasSupabaseConfig) return <EmptySetup />;
  if (pathInfo.path === '/login') return <LoginPage />;
  return <ProtectedOs pathInfo={pathInfo} />;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data: authData, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        'Login'
      );
      if (error) {
        setMessage('Login failed. Please check your email and password.');
        return;
      }
      const { data: profileRow, error: profileError } = await loadProfileForUser(authData.user.id);
      const issue = getProfileIssue(profileRow, profileError);
      if (issue) {
        await supabase.auth.signOut();
        setMessage(`${issue.title} ${issue.body}`);
        return;
      }
      go('/dashboard');
    } catch (error) {
      setMessage(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-16 text-slate-700">
      <div className="mx-auto max-w-md rounded-xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70">
        <p className="text-sm font-semibold text-sky-700">TY Swim Academy OS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Admin / Coach Login</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <Field label="Email"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Password"><Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          {message ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium leading-6 text-rose-700">{message}</p> : null}
          <Button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
        </form>
        <p className="mt-5 text-sm leading-6 text-slate-500">If login succeeds but the profile is missing, ask Admin to create or activate your staff profile in Supabase.</p>
      </div>
    </div>
  );
}

function ProtectedOs({ pathInfo }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(initialData);
  const [tableErrors, setTableErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [accessIssue, setAccessIssue] = useState(null);
  const [toasts, setToasts] = useState([]);

  const toast = (message) => {
    const id = makeId('toast');
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 2600);
  };

  async function reload() {
    setLoading(true);
    setAccessIssue(null);
    setTableErrors({});
    try {
      const { data: auth } = await withTimeout(supabase.auth.getSession(), 'Session check');
      if (!auth.session) {
        setLoading(false);
        go('/login');
        return;
      }
      setSession(auth.session);
      const { data: profileRow, error: profileError } = await loadProfileForUser(auth.session.user.id);
      const issue = getProfileIssue(profileRow, profileError);
      if (issue) {
        setProfile(profileRow || null);
        setAccessIssue(issue);
        setLoading(false);
        return;
      }
      setProfile(profileRow);
      const tablesToLoad = profileRow.role === 'admin' ? allTableNames : coachTableNames;
      const tableResults = await withTimeout(
        Promise.all(tablesToLoad.map((name) => supabase.from(name).select('*').limit(1000))),
        'Loading OS data',
        18000
      );
      const next = { ...initialData };
      const nextTableErrors = {};
      tableResults.forEach((result, index) => {
        if (!result.error) next[tablesToLoad[index]] = result.data || [];
        else nextTableErrors[tablesToLoad[index]] = result.error.message;
      });
      setData(next);
      setTableErrors(nextTableErrors);
    } catch (error) {
      setAccessIssue({
        title: 'TY Swim Academy OS could not finish loading',
        body: error.message || 'Please check your Supabase connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) go('/login');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Loading TY Swim Academy OS...</div>;
  if (accessIssue) return <StaffAccessIssue issue={accessIssue} />;
  if (!session || !profile) return <LoginPage />;

  return (
    <OsShell session={session} profile={profile} pathInfo={pathInfo} data={data} tableErrors={tableErrors} reload={reload} toast={toast}>
      <Toasts toasts={toasts} />
    </OsShell>
  );
}

function StaffAccessIssue({ issue }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
        <p className="text-sm font-semibold text-sky-700">TY Swim Academy OS</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-950">{issue.title}</h1>
        <p className="mt-2 text-sm leading-6">{issue.body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={async () => { await supabase.auth.signOut(); go('/login'); }}>Back to login</Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

function OsShell({ session, profile, pathInfo, data, tableErrors, reload, toast, children }) {
  const isAdmin = profile.role === 'admin';
  const nav = isAdmin ? adminNav : coachNav;
  const mobileNav = isAdmin
    ? adminNav.filter(([key]) => ['dashboard', 'students', 'schedule', 'review', 'more'].includes(key))
    : coachNav;

  const signOut = async () => {
    await supabase.auth.signOut();
    go('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      {children}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white p-4 lg:block">
        <button className="text-left" onClick={() => go('/dashboard')}>
          <p className="text-sm font-semibold text-sky-700">TY Swim Academy</p>
          <h1 className="text-xl font-semibold text-slate-950">OS</h1>
        </button>
        <nav className="mt-6 grid gap-1">
          {nav.map(([key, href, label]) => (
            <button key={key} onClick={() => go(href)} className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${activeNav(pathInfo, key) ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sky-700">TY Swim OS · {isAdmin ? 'Admin' : 'Coach'}</p>
              <h2 className="text-lg font-semibold leading-tight text-slate-950 ty-wrap">{pageTitle(pathInfo, profile)}</h2>
            </div>
            <Button className="shrink-0" variant="ghost" onClick={() => go('/more')}>More</Button>
          </div>
          <div className="hidden items-center justify-between gap-3 lg:flex">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{profile.role}</p>
              <h2 className="text-xl font-semibold text-slate-950">{pageTitle(pathInfo, profile)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => go('/dashboard')}>Dashboard</Button>
              <Button data-testid="sign-out-button" variant="ghost" onClick={signOut}>Sign out / 登出</Button>
            </div>
          </div>
        </header>
        <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-6">
          <RoutePage session={session} profile={profile} pathInfo={pathInfo} data={data} tableErrors={tableErrors} reload={reload} toast={toast} signOut={signOut} />
        </main>
        <MobileBottomNav nav={mobileNav} pathInfo={pathInfo} />
      </div>
    </div>
  );
}

function MobileBottomNav({ nav, pathInfo }) {
  return (
    <nav aria-label="Mobile navigation" data-testid="mobile-bottom-nav" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-2 shadow-xl shadow-slate-300/40 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map(([key, href, label]) => {
          const active = activeNav(pathInfo, key) || (key === 'more' && ['money', 'payments', 'expenses'].includes(pathInfo.section));
          const shortLabel = label.replace('My ', '');
          return (
            <button key={key} onClick={() => go(href)} className={`min-h-12 rounded-xl px-1 text-xs font-semibold ${active ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'}`}>
              {shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function activeNav(pathInfo, key) {
  if (key === 'dashboard') return pathInfo.path === '/dashboard';
  if (key === 'schedule') return ['schedule', 'lessons'].includes(pathInfo.section);
  if (key === 'students') return ['students', 'customers', 'venues', 'classes', 'packages', 'skill-levels'].includes(pathInfo.section);
  if (key === 'money') return ['money', 'payments', 'payroll', 'expenses'].includes(pathInfo.section);
  if (key === 'more') return ['more', 'help', 'system-check', 'audit-logs', 'import', 'data-cleanup', 'reports', 'settings'].includes(pathInfo.section);
  return pathInfo.section === key;
}

function pageTitle(pathInfo, profile) {
  if (pathInfo.path === '/dashboard') return 'Today';
  if (pathInfo.section === 'system-check' && profile?.role === 'coach') return 'My Account Check';
  return {
    customers: 'Customers',
    students: 'Students',
    'skill-levels': 'Levels & Progress',
    schedule: 'Schedule',
    venues: 'Venues',
    classes: 'Classes',
    packages: 'Packages',
    lessons: 'Schedule / Lessons',
    review: 'Review Queue',
    money: 'Money',
    'system-check': 'Setup Check',
    'audit-logs': 'Audit Logs',
    payroll: 'Payroll',
    payments: 'Payments',
    expenses: 'Expenses',
    help: 'Help Guide',
    more: 'More',
    import: 'CSV Import',
    'data-cleanup': 'Data Cleanup',
    reports: 'Reports',
    settings: 'Settings',
  }[pathInfo.section] || 'TY Swim Academy OS';
}

function RoutePage(props) {
  const { pathInfo, profile } = props;
  const isAdmin = profile.role === 'admin';
  if (pathInfo.path === '/dashboard') return <Dashboard {...props} />;
  if (pathInfo.section === 'customers' && pathInfo.id) return <CustomerDetail {...props} />;
  if (pathInfo.section === 'students' && pathInfo.id) return <StudentProfilePage {...props} />;
  if (pathInfo.section === 'lessons' && pathInfo.id) return <LessonDetail {...props} />;
  if (pathInfo.section === 'customers') return <CustomersPage {...props} />;
  if (pathInfo.section === 'students') return isAdmin ? <StudentsHub {...props} /> : <StudentsPage {...props} />;
  if (pathInfo.section === 'skill-levels') return <SkillLevelsPage {...props} />;
  if (pathInfo.section === 'venues') return <VenuesPage {...props} />;
  if (pathInfo.section === 'classes') return <ClassesPage {...props} />;
  if (pathInfo.section === 'packages') return <PackagesPage {...props} />;
  if (pathInfo.section === 'lessons' || pathInfo.section === 'schedule') return <LessonsPage {...props} />;
  if (pathInfo.section === 'payroll') return <PayrollPage {...props} />;
  if (pathInfo.section === 'system-check') return <SystemCheckPage {...props} />;
  if (pathInfo.section === 'help') return <HelpPage {...props} />;
  if (pathInfo.section === 'more') return <MorePage {...props} />;
  if (!isAdmin) return <NoAccess />;
  if (pathInfo.section === 'review') return <ReviewPage {...props} />;
  if (pathInfo.section === 'money') return <MoneyPage {...props} />;
  if (pathInfo.section === 'payments') return <PaymentsPage {...props} />;
  if (pathInfo.section === 'expenses') return <ExpensesPage {...props} />;
  if (pathInfo.section === 'import') return <ImportPage {...props} />;
  if (pathInfo.section === 'data-cleanup') return <CleanupPage {...props} />;
  if (pathInfo.section === 'reports') return <ReportsPage {...props} />;
  if (pathInfo.section === 'audit-logs') return <AuditLogPage {...props} />;
  if (pathInfo.section === 'settings') return <SettingsPage {...props} />;
  return <Dashboard {...props} />;
}

function NoAccess() {
  return <Section title="No access"><p className="text-sm text-slate-500">This page is Admin only.</p></Section>;
}

function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="font-semibold text-slate-950 ty-wrap">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function OnboardingChecklist({ data }) {
  const hasCoachSubmission = data.lessons.some((lesson) => ['completed_pending_review', 'cancelled_pending_review', 'approved'].includes(lesson.status));
  const hasApprovedLesson = data.lessons.some((lesson) => lesson.status === 'approved');
  const steps = [
    ['Add coach', data.coaches.length > 0, '/more'],
    ['Add customer/family', data.customers.length > 0, '/students'],
    ['Add student', data.students.length > 0, '/students'],
    ['Add venue', data.venues.length > 0, '/students'],
    ['Create class/group', data.classes.length > 0, '/students'],
    ['Create package', data.packages.length > 0, '/students'],
    ['Schedule first lesson', data.lessons.length > 0, '/schedule'],
    ['Test coach submission', hasCoachSubmission, '/review'],
    ['Approve lesson', hasApprovedLesson, '/review'],
  ];
  if (steps.every(([, done]) => done)) return null;
  return (
    <Section title="Setup Checklist">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {steps.map(([label, done, href], index) => (
          <button key={label} onClick={() => go(href)} className={`rounded-lg border p-3 text-left ${done ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
            <p className="mt-1 font-semibold text-slate-950 ty-wrap">{label}</p>
            <p className={`mt-2 text-xs font-semibold ${done ? 'text-emerald-700' : 'text-sky-700'}`}>{done ? 'Done' : 'Open'}</p>
          </button>
        ))}
      </div>
    </Section>
  );
}

function Dashboard({ profile, data }) {
  return profile.role === 'admin' ? <AdminDashboard data={data} /> : <CoachDashboard profile={profile} data={data} />;
}

function AdminDashboard({ data }) {
  const now = todayISO();
  const lessonsToday = data.lessons.filter((lesson) => lesson.scheduled_date === now);
  const weekLessons = data.lessons.filter((lesson) => lesson.scheduled_date >= now).slice(0, 12);
  const pending = data.lessons.filter((lesson) => ['completed_pending_review', 'cancelled_pending_review', 'needs_edit'].includes(lesson.status));
  const reschedules = data.lesson_change_logs.filter((log) => !log.admin_seen);
  const cancelled = data.lessons.filter((lesson) => lesson.status === 'cancelled_pending_review');
  const missingPhotos = data.lessons.filter((lesson) => {
    const cls = data.classes.find((item) => item.id === lesson.class_id);
    return cls?.photo_required && !data.lesson_photos.some((photo) => photo.lesson_id === lesson.id);
  });
  const oneRemaining = data.packages.filter((pkg) => Number(pkg.remaining_lessons) === 1);
  const zeroRemaining = data.packages.filter((pkg) => Number(pkg.remaining_lessons) === 0);
  const expiring = data.packages.filter((pkg) => {
    const days = daysUntil(pkg.expiry_date);
    return days >= 0 && days <= 7;
  });
  const expiredWithLessons = data.packages.filter((pkg) => daysUntil(pkg.expiry_date) < 0 && Number(pkg.remaining_lessons) > 0);
  const replacement = data.lessons.filter((lesson) => lesson.need_replacement);
  const cleanup = cleanupRows(data).length;
  const primaryCards = [
    ["Today's lessons", lessonsToday.length, 'Know what is happening today.', '/schedule', 'sky'],
    ['Pending review', pending.length, 'Approve or request edits from coaches.', '/review', 'amber'],
    ['Reschedule alerts', reschedules.length, 'Coach date/time changes to check.', '/review', 'rose'],
    ['Renewals soon', oneRemaining.length + expiring.length, '1 lesson left or expiring in 7 days.', '/students', 'amber'],
  ];
  const nextActions = [
    ['Review coach submissions', pending.length, '/review'],
    ['Check reschedules', reschedules.length, '/review'],
    ['Handle cancelled lessons', cancelled.length, '/review'],
    ['Fix missing required photos', missingPhotos.length, '/review'],
    ['Follow up renewal reminders', oneRemaining.length + zeroRemaining.length + expiring.length + expiredWithLessons.length, '/students'],
    ['Plan replacement lessons', replacement.length, '/schedule'],
    ['Clean missing data', cleanup, '/data-cleanup'],
  ];
  const quickActions = [
    ['Add Family', '/students', 'primary'],
    ['Schedule Lesson', '/schedule', 'soft'],
    ['Review Lessons', '/review', 'ghost'],
    ['Setup Check', '/system-check', 'ghost'],
  ];

  return (
    <div className="grid gap-5">
      <OnboardingChecklist data={data} />
      <Section title="Today" action={<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{quickActions.map(([label, href, variant]) => <Button key={label} variant={variant} onClick={() => go(href)}>{label}</Button>)}</div>}>
        <p className="mb-4 text-sm leading-6 text-slate-500">A simple daily view for lessons, coach submissions, schedule changes, and renewal follow-ups.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryCards.map(([title, value, note, href, tone]) => (
            <button key={title} onClick={() => go(href)} className="text-left">
              <Card title={title} value={value} note={note} tone={tone} />
            </button>
          ))}
        </div>
      </Section>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <LessonList title="Today and This Week" rows={weekLessons} data={data} empty="No scheduled lessons in this view." />
        <NextActionList rows={nextActions} />
      </div>
    </div>
  );
}

function CoachDashboard({ profile, data }) {
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const ownLessons = data.lessons.filter((lesson) => lesson.coach_id === coach?.id);
  const today = ownLessons.filter((lesson) => lesson.scheduled_date === todayISO());
  const pending = ownLessons.filter((lesson) => ['scheduled', 'rescheduled', 'needs_edit'].includes(lesson.status));
  const payroll = data.payroll_items.filter((item) => item.coach_id === coach?.id && item.status !== 'void');
  const todayDone = today.length > 0 && today.every((lesson) => ['completed_pending_review', 'cancelled_pending_review', 'approved', 'rejected', 'archived', 'void'].includes(lesson.status));

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Today's lessons" value={today.length} />
        <Card title="This week" value={ownLessons.filter((lesson) => daysUntil(lesson.scheduled_date) >= 0 && daysUntil(lesson.scheduled_date) <= 7).length} />
        <Card title="Pending records" value={pending.length} tone="amber" />
        <Card title="Expected payroll" value={formatMoney(payroll.reduce((sum, item) => sum + Number(item.pay_amount || 0), 0))} tone="green" />
      </div>
      {todayDone ? <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">All today's lesson records submitted.</div> : null}
      <CoachTodayCards lessons={today.length ? today : ownLessons.filter((lesson) => lesson.scheduled_date >= todayISO()).slice(0, 5)} data={data} />
      <LessonList title="My Schedule" rows={ownLessons.filter((lesson) => lesson.scheduled_date >= todayISO()).slice(0, 10)} data={data} coachView empty="No upcoming assigned lessons." />
    </div>
  );
}

function CoachTodayCards({ lessons, data }) {
  return (
    <Section title="Today" action={<Button variant="ghost" onClick={() => go('/system-check')}>My Account Check</Button>}>
      {lessons.length === 0 ? (
        <EmptyState title="No lessons today" body="Assigned lessons will appear here with contact, map, safety alerts, and a fast submit button." />
      ) : (
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {lessons.map((lesson) => {
            const cls = data.classes.find((item) => item.id === lesson.class_id);
            const customer = data.customers.find((item) => item.id === cls?.customer_id);
            const venue = data.venues.find((item) => item.id === lesson.venue_id);
            const mapsLink = venue?.google_maps_link || '';
            const whatsapp = customer?.whatsapp || '';
            const approved = lesson.status === 'approved';
            const photoRequired = Boolean(cls?.photo_required || lesson.photo_required);
            return (
              <article key={lesson.id} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sky-700">{lesson.start_time || 'Time TBC'} - {lesson.end_time || ''}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950 ty-wrap">{cls?.class_name || lesson.lesson_code}</h3>
                    <p className="mt-1 text-sm text-slate-700 ty-wrap">{classStudentNames(cls?.id, data)}</p>
                    <p className="mt-1 text-sm text-slate-500 ty-wrap">{venue?.full_address || venue?.area || venue?.venue_name || 'Venue not set'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:grid sm:justify-items-end">
                    <StatusBadge value={lesson.status} />
                    {photoRequired ? <StatusBadge value="needs_edit">Photo required today</StatusBadge> : null}
                  </div>
                </div>
                {studentAlerts(cls, data) ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 ty-wrap">{studentAlerts(cls, data)}</p> : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <a className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold ty-wrap ${whatsapp ? 'border-sky-100 bg-sky-50 text-sky-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={whatsapp ? `https://wa.me/${String(whatsapp).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer">{whatsapp ? 'WhatsApp' : 'No WhatsApp'}</a>
                  <a className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold ty-wrap ${mapsLink ? 'border-slate-200 bg-white text-slate-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={mapsLink || undefined} target="_blank" rel="noreferrer">{mapsLink ? 'Map' : 'No map'}</a>
                  <Button data-testid={!approved ? 'coach-submit-record-button' : undefined} disabled={approved} onClick={() => go(`/lessons/${lesson.id}`)}>{approved ? 'Approved' : 'Submit Record'}</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function NextActionList({ rows }) {
  const activeRows = rows.filter(([, value]) => Number(value) > 0);
  return (
    <Section title="Next Actions">
      <div className="grid gap-2">
        {activeRows.length === 0 ? <EmptyState title="Nothing urgent right now" body="No review, renewal, replacement, or missing data items need action." /> : null}
        {activeRows.map(([label, value, href]) => (
          <button key={label} onClick={() => go(href)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-sky-200 hover:bg-sky-50">
            <span className="font-medium text-slate-700">{label}</span>
            <span className="text-lg font-semibold text-slate-950">{value}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function LessonList({ title, rows, data, coachView = false, empty = 'No lessons yet.' }) {
  return (
    <Section title={title}>
      <LessonCardList rows={rows} data={data} empty={empty} coachView={coachView} />
      <DataTable
        className="hidden md:block"
        rows={rows}
        empty={empty}
        onRowClick={(row) => go(`/lessons/${row.id}`)}
        columns={[
          { key: 'date', label: 'Date', render: (row) => `${formatDate(row.scheduled_date)} ${row.start_time || ''}` },
          { key: 'class', label: 'Class', render: (row) => data.classes.find((item) => item.id === row.class_id)?.class_name || row.lesson_code },
          { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'contact', label: coachView ? 'Contact' : 'Venue', render: (row) => {
            const cls = data.classes.find((item) => item.id === row.class_id);
            const customer = data.customers.find((item) => item.id === cls?.customer_id);
            const venue = data.venues.find((item) => item.id === row.venue_id);
            return coachView ? customer?.whatsapp || '-' : venue?.area || venue?.venue_name || '-';
          } },
        ]}
      />
    </Section>
  );
}

function LessonCardList({ rows, data, empty, coachView = false }) {
  if (rows.length === 0) return <EmptyState title="No lessons found" body={empty} />;
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((lesson) => {
        const cls = data.classes.find((item) => item.id === lesson.class_id);
        const customer = data.customers.find((item) => item.id === cls?.customer_id);
        const venue = data.venues.find((item) => item.id === lesson.venue_id);
        const whatsapp = customer?.whatsapp || '';
        const mapsLink = venue?.google_maps_link || '';
        const approved = lesson.status === 'approved';
        return (
          <article key={lesson.id} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sky-700">{formatDate(lesson.scheduled_date)} {lesson.start_time || ''}</p>
                <p className="mt-1 font-semibold text-slate-950 ty-wrap">{cls?.class_name || lesson.lesson_code}</p>
                <p className="mt-1 text-sm text-slate-600 ty-wrap">{classStudentNames(cls?.id, data)}</p>
                <p className="mt-1 text-sm text-slate-500 ty-wrap">{venue?.area || venue?.venue_name || customer?.whatsapp || '-'}</p>
              </div>
              <StatusBadge value={lesson.status} />
            </div>
            <div className="mt-4 grid gap-2">
              <Button data-testid={coachView && !approved ? 'coach-submit-record-button' : undefined} onClick={() => go(`/lessons/${lesson.id}`)}>{coachView ? (approved ? 'Approved' : 'Submit / Open') : 'Open'}</Button>
              {coachView ? (
                <div className="grid grid-cols-2 gap-2">
                  <a className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold ty-wrap ${whatsapp ? 'border-sky-100 bg-sky-50 text-sky-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={whatsapp ? `https://wa.me/${String(whatsapp).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer">{whatsapp ? 'WhatsApp' : 'No WhatsApp'}</a>
                  <a className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold ty-wrap ${mapsLink ? 'border-slate-200 bg-white text-slate-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={mapsLink || undefined} target="_blank" rel="noreferrer">{mapsLink ? 'Map' : 'No map'}</a>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StudentsHub(props) {
  const { data, reload, toast, profile } = props;
  const [active, setActive] = useState('customers');
  const [advanced, setAdvanced] = useState(false);
  const [mode, setMode] = useState(data.students.length ? 'profiles' : 'add');
  const [progressStudent, setProgressStudent] = useState(null);
  const tabs = [
    ['customers', 'Families'],
    ['students', 'Students'],
    ['venues', 'Venues'],
    ['classes', 'Classes'],
    ['packages', 'Packages'],
  ];
  return (
    <div className="grid gap-5">
      <Section title="Students" action={<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button variant={mode === 'profiles' ? 'primary' : 'ghost'} onClick={() => setMode('profiles')}>Student Profiles</Button><Button variant={mode === 'add' ? 'primary' : 'soft'} onClick={() => setMode('add')}>Add Student / Family</Button></div>}>
        <p className="text-sm leading-6 text-slate-500">Use Student Profiles for daily view and follow-up. Use Add Student / Family when a new family joins, then fill the missing pieces step by step.</p>
      </Section>
      {mode === 'add' ? <StudentSetupWizard data={data} reload={reload} toast={toast} profile={profile} onOpenAdvanced={(key) => { setActive(key); setAdvanced(true); }} /> : null}
      {mode === 'profiles' ? <StudentProfileDirectory data={data} profile={profile} onUpdateProgress={setProgressStudent} onAddStudent={() => setMode('add')} /> : null}
      <Section title="Advanced records" action={<Button variant="ghost" onClick={() => setAdvanced((value) => !value)}>{advanced ? 'Hide advanced records' : 'Show advanced records'}</Button>}>
        <p className="text-sm leading-6 text-slate-500">Use these only for detailed corrections, CSV export, or unusual records. The profile cards and guided setup are the normal daily workflow.</p>
      </Section>
      {advanced ? (
        <>
          <Section title="Advanced Records">
            <div className="flex flex-wrap gap-2">
              {tabs.map(([key, label]) => (
                <Button key={key} variant={active === key ? 'primary' : 'ghost'} onClick={() => setActive(key)}>{label}</Button>
              ))}
            </div>
          </Section>
          {active === 'customers' ? <CustomersPage {...props} /> : null}
          {active === 'students' ? <StudentsPage {...props} /> : null}
          {active === 'venues' ? <VenuesPage {...props} /> : null}
          {active === 'classes' ? <ClassesPage {...props} /> : null}
          {active === 'packages' ? <PackagesPage {...props} /> : null}
        </>
      ) : null}
      {progressStudent ? <StudentProgressModal student={progressStudent} data={data} profile={profile} reload={reload} toast={toast} onClose={() => setProgressStudent(null)} /> : null}
    </div>
  );
}

function StudentProfileDirectory({ data, profile, onUpdateProgress, onAddStudent }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [levelFilter, setLevelFilter] = useState('');
  const isAdmin = profile.role === 'admin';
  const rows = data.students.map((student) => buildStudentProfileContext(student, data)).filter((item) => {
    const text = [
      item.student.display_name,
      item.customer?.display_name,
      item.customer?.parent_name,
      item.customer?.whatsapp,
      item.primaryClass?.class_name,
      item.coach?.display_name,
      item.coach?.coach_code,
      item.venue?.area,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const days = daysUntil(item.activePackage?.expiry_date);
    const matchesFilter = filter === 'all'
      || (filter === 'active' && item.student.status !== 'inactive')
      || (filter === 'expiring' && days >= 0 && days <= 14)
      || (filter === 'low' && Number(item.activePackage?.remaining_lessons || 0) <= 1)
      || (filter === 'missing-health' && (!item.student.health_notes && !item.student.safety_alert))
      || (filter === 'missing-venue' && !item.venue?.full_address)
      || (filter === 'missing-consent' && (!item.student.photo_consent_status || item.student.photo_consent_status === 'unknown'));
    const matchesLevel = !levelFilter || Number(item.skillProfile.current_level) === Number(levelFilter);
    return matchesQuery && matchesFilter && matchesLevel;
  });
  const filterLabels = [
    ['active', 'Active'],
    ['all', 'All'],
    ['expiring', 'Expiring soon'],
    ['low', 'Low lessons'],
    ['missing-health', 'Missing health'],
    ['missing-venue', 'Missing venue'],
    ['missing-consent', 'Missing consent'],
  ];
  return (
    <Section title={isAdmin ? 'Student / Family Profiles' : 'My Students'} action={isAdmin ? <Button onClick={onAddStudent || (() => go('/students'))}>Add Student / Family</Button> : null}>
      <p className="text-sm leading-6 text-slate-500">{isAdmin ? 'Search families and open a clean profile with safety, lesson setup, package, progress, and recent lessons.' : 'Open a student profile for WhatsApp, map, safety notes, current level, progress, and lesson history.'}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, parent, phone, class, coach, area" />
        <Select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="lg:w-40">
          <option value="">All levels</option>
          {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>Level {level}</option>)}
        </Select>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filterLabels.map(([key, label]) => <Button key={key} variant={filter === key ? 'primary' : 'ghost'} className="shrink-0" onClick={() => setFilter(key)}>{label}</Button>)}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No matching students" body={isAdmin ? 'Try a different search or start by adding a new family.' : 'Assigned students will appear after Admin links you to a class.'} action={isAdmin ? <Button onClick={onAddStudent || (() => go('/students'))}>Add Student / Family</Button> : null} />
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => <StudentProfileCard key={item.student.id} item={item} isAdmin={isAdmin} onUpdateProgress={onUpdateProgress} />)}
        </div>
      )}
    </Section>
  );
}

function StudentProfileCard({ item, isAdmin, onUpdateProgress }) {
  const { student, customer, primaryClass, coach, venue, activePackage, skillProfile, missingItems } = item;
  const whatsapp = customer?.whatsapp;
  const map = venue?.google_maps_link;
  const lowPackage = Number(activePackage?.remaining_lessons || 0) <= 1;
  return (
    <article data-testid="student-profile-card" className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950 ty-wrap">{student.display_name || 'Unnamed student'}</h3>
          <p className="mt-1 text-sm text-slate-500 ty-wrap">{customer?.display_name || 'Family not set'}{customer?.parent_name ? ` / ${customer.parent_name}` : ''}</p>
        </div>
        <StudentLevelBadge student={student} data={item.data} />
      </div>
      {student.safety_alert ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm font-semibold text-rose-700 ty-wrap">{student.safety_alert}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Info label="Coach" value={coach?.display_name || coach?.coach_code || 'Not set'} />
        <Info label="Class" value={primaryClass?.class_name || primaryClass?.class_type || 'Not set'} />
        <Info label="Package" value={<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${lowPackage ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'}`}>{activePackage ? `${activePackage.remaining_lessons} left` : 'No package'}</span>} />
        <Info label="Focus" value={skillProfile.current_focus || student.learning_goal || 'Not set'} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {missingItems.slice(0, 4).map((label) => <span key={label} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{label}</span>)}
        {missingItems.length > 4 ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">+{missingItems.length - 4} more</span> : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={() => go(`/students/${student.id}`)}>Open Profile</Button>
        <Button variant="soft" onClick={() => onUpdateProgress(student)}>Update Progress</Button>
        <a className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold ty-wrap ${whatsapp ? 'border-sky-100 bg-sky-50 text-sky-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={whatsapp ? `https://wa.me/${String(whatsapp).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer">{whatsapp ? 'WhatsApp' : 'No WhatsApp'}</a>
        <a className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold ty-wrap ${map ? 'border-slate-200 bg-white text-slate-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={map || undefined} target="_blank" rel="noreferrer">{map ? 'Map' : 'No map'}</a>
      </div>
      {isAdmin && customer?.internal_notes ? <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-500 ty-wrap">Admin note: {customer.internal_notes}</p> : null}
    </article>
  );
}

function StudentSetupWizard({ data, reload, toast, profile, onOpenAdvanced }) {
  const [step, setStep] = useState(0);
  const [context, setContext] = useState({ customerId: '', studentIds: [], venueId: '', classId: '', packageId: '' });
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [family, setFamily] = useState({ display_name: '', parent_name: '', whatsapp: '', secondary_contact: '', source: '', internal_notes: '', status: 'active' });
  const [student, setStudent] = useState({ display_name: '', age: '', gender: '', level: '1', learning_goal: '', health_notes: '', special_needs: '', safety_alert: '', preferred_language: 'English', photo_consent_status: 'unknown', photo_consent_note: '', status: 'active' });
  const [venue, setVenue] = useState({ venue_name: '', full_address: '', area: '', pool_type: 'condo', google_maps_link: '', access_instruction: '', parking_note: '', pool_depth_note: '', active: true });
  const [clsForm, setClsForm] = useState({ class_name: '', class_type: '1-2', scheduling_mode: 'fixed_weekly', assigned_coach_id: data.coaches[0]?.id || '', default_duration_minutes: 60, day_of_week: '6', fixed_start_time: '17:00', fixed_end_time: '18:00', photo_required: false, status: 'active' });
  const [pkgForm, setPkgForm] = useState({ package_type: '8_lessons', total_lessons: 8, used_lessons: 0, remaining_lessons: 8, validity_months: 4, start_date: todayISO(), payment_date: todayISO(), status: 'active', amount: '', payment_status: 'pending', payment_method: 'bank_transfer' });
  const [lessonForm, setLessonForm] = useState({ scheduled_date: todayISO(), start_time: '17:00', end_time: '18:00' });
  const customerId = context.customerId || data.customers[0]?.id || '';
  const customerStudents = data.students.filter((item) => item.customer_id === customerId);
  const selectedClass = data.classes.find((item) => item.id === context.classId);
  const steps = [
    ['Family', 'Add Family / Customer', 'Parent name and WhatsApp.'],
    ['Student', 'Add Student(s)', 'Student details, level, and safety notes.'],
    ['Venue', 'Add Venue / Address', 'Pool address, map, and access notes.'],
    ['Class', 'Create Class / Group', 'Choose coach, class type, students, and schedule mode.'],
    ['Package', 'Add Package', 'Set lessons, remaining count, and expiry.'],
    ['Schedule', 'Schedule First Lesson', 'Create the first lesson appointment.'],
  ];
  const completedSteps = [
    Boolean(context.customerId),
    customerStudents.length > 0 || context.studentIds.length > 0,
    Boolean(context.venueId),
    Boolean(context.classId),
    Boolean(context.packageId),
    false,
  ];
  const saveFamily = async (event) => {
    event.preventDefault();
    const { data: saved, error } = await supabase.from('customers').insert({ ...family, parent_name: family.parent_name || family.display_name }).select('*').single();
    if (error) return toast(error.message);
    setContext((current) => ({ ...current, customerId: saved.id }));
    setFamily({ display_name: '', parent_name: '', whatsapp: '', secondary_contact: '', source: '', internal_notes: '', status: 'active' });
    toast('Family saved. Next: add student details.');
    await reload();
    setStep(1);
  };
  const saveStudent = async (event) => {
    event.preventDefault();
    if (!customerId) return toast('Add or select a family first.');
    const { data: saved, error } = await supabase.from('students').insert({ ...student, customer_id: customerId, age: student.age ? Number(student.age) : null, photo_consent_updated_at: student.photo_consent_status !== 'unknown' ? new Date().toISOString() : null }).select('*').single();
    if (error) return toast(error.message);
    setContext((current) => ({ ...current, studentIds: [...new Set([...current.studentIds, saved.id])] }));
    setSelectedStudentIds((current) => [...new Set([...current, saved.id])]);
    setStudent({ display_name: '', age: '', gender: '', level: '1', learning_goal: '', health_notes: '', special_needs: '', safety_alert: '', preferred_language: 'English', photo_consent_status: 'unknown', photo_consent_note: '', status: 'active' });
    toast('Student saved. Add another student or continue to venue.');
    await reload();
  };
  const saveVenue = async (event) => {
    event.preventDefault();
    const { data: saved, error } = await supabase.from('venues').insert({ ...venue, customer_id: customerId || null }).select('*').single();
    if (error) return toast(error.message);
    setContext((current) => ({ ...current, venueId: saved.id }));
    setVenue({ venue_name: '', full_address: '', area: '', pool_type: 'condo', google_maps_link: '', access_instruction: '', parking_note: '', pool_depth_note: '', active: true });
    toast('Venue saved. Next: create the class/group.');
    await reload();
    setStep(3);
  };
  const saveClass = async (event) => {
    event.preventDefault();
    if (!customerId) return toast('Select a family before creating a class.');
    const studentIds = selectedStudentIds.length ? selectedStudentIds : customerStudents.map((item) => item.id);
    const { day_of_week, fixed_start_time, fixed_end_time, ...classPayload } = clsForm;
    const payload = { ...classPayload, customer_id: customerId, assigned_coach_id: clsForm.assigned_coach_id || null, default_venue_id: context.venueId || null, class_name: clsForm.class_name || `${data.customers.find((item) => item.id === customerId)?.display_name || 'Family'} Group` };
    const { data: saved, error } = await supabase.from('classes').insert(payload).select('*').single();
    if (error) return toast(error.message);
    if (studentIds.length) {
      await supabase.from('class_students').insert(studentIds.map((studentId) => ({ class_id: saved.id, student_id: studentId, active: true })));
    }
    if (saved.scheduling_mode === 'fixed_weekly' && saved.assigned_coach_id && fixed_start_time && fixed_end_time) {
      await supabase.from('recurring_schedules').insert({
        class_id: saved.id,
        coach_id: saved.assigned_coach_id,
        venue_id: saved.default_venue_id,
        day_of_week: Number(day_of_week),
        start_time: fixed_start_time,
        end_time: fixed_end_time,
        active_from: todayISO(),
        status: 'active',
        notes: 'Created from student setup flow.',
      });
    }
    setContext((current) => ({ ...current, classId: saved.id }));
    toast('Class saved. Next: add the package.');
    await reload();
    setStep(4);
  };
  const savePackage = async (event) => {
    event.preventDefault();
    if (!customerId || !context.classId) return toast('Create the family and class before adding a package.');
    const { amount, payment_status, payment_method, ...packageForm } = pkgForm;
    const payload = { ...packageForm, customer_id: customerId, class_id: context.classId, total_lessons: Number(pkgForm.total_lessons), used_lessons: Number(pkgForm.used_lessons), remaining_lessons: Number(pkgForm.remaining_lessons), validity_months: Number(pkgForm.validity_months) };
    payload.expiry_date = derivePackageExpiry(payload);
    const { data: saved, error } = await supabase.from('packages').insert(payload).select('*').single();
    if (error) return toast(error.message);
    if (amount || payment_status === 'paid') {
      await supabase.from('package_financials').insert({
        package_id: saved.id,
        customer_id: customerId,
        amount: Number(amount || 0),
        payment_date: pkgForm.payment_date,
        payment_method: payment_method || 'other',
        payment_status,
        notes: 'Created from student setup flow. Upload proof in Money > Payments if needed.',
      });
    }
    setContext((current) => ({ ...current, packageId: saved.id }));
    toast('Package saved. Next: schedule the first lesson.');
    await reload();
    setStep(5);
  };
  const saveLesson = async (event) => {
    event.preventDefault();
    if (!context.classId) return toast('Create a class before scheduling a lesson.');
    const cls = selectedClass || data.classes.find((item) => item.id === context.classId);
    const payload = { ...lessonForm, class_id: context.classId, package_id: context.packageId || data.packages.find((item) => item.class_id === context.classId)?.id || null, coach_id: cls?.assigned_coach_id || null, venue_id: cls?.default_venue_id || context.venueId || null, scheduling_mode: cls?.scheduling_mode || 'flexible', duration_minutes: cls?.default_duration_minutes || 60, status: 'scheduled', created_by: profile.id, updated_by: profile.id };
    const { error } = await supabase.from('lessons').insert(payload);
    if (error) return toast(error.message);
    toast('First lesson scheduled.');
    await reload();
    go('/schedule');
  };
  return (
    <Section title="Add Student / Family">
      <p className="text-sm leading-6 text-slate-500">Create a family, student, venue, class, package, and first lesson in one guided flow. Required fields are marked by the browser; optional details can be added now or filled later from the profile.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-6">
        {steps.map(([short, title, body], index) => (
          <button key={title} onClick={() => setStep(index)} className={`rounded-lg border p-3 text-left ${step === index ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
            <div className="flex items-center justify-between gap-3 md:block">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Step {index + 1}</p>
                <p className="font-semibold text-slate-950 ty-wrap">{short}</p>
              </div>
              <span className={`text-sm font-semibold md:mt-2 md:block ${completedSteps[index] ? 'text-emerald-600' : step === index ? 'text-sky-700' : 'text-slate-300'}`}>{completedSteps[index] ? 'Done' : step === index ? 'Open' : 'Next'}</span>
            </div>
            <p className={`${step === index ? 'block' : 'hidden'} mt-2 text-xs leading-5 text-slate-500 md:block`}>{body}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        {step === 0 ? (
          <form className="grid gap-3" onSubmit={saveFamily}>
            <WizardHeader title="Step 1: Add Family / Customer" body="Start with the parent or family contact. WhatsApp is kept as text so leading zeroes stay safe." />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Family display name"><Input required value={family.display_name} onChange={(event) => setFamily({ ...family, display_name: event.target.value })} placeholder="Tan Family" /></Field>
              <Field label="Parent name"><Input value={family.parent_name} onChange={(event) => setFamily({ ...family, parent_name: event.target.value })} /></Field>
              <Field label="WhatsApp"><Input value={family.whatsapp} onChange={(event) => setFamily({ ...family, whatsapp: event.target.value })} placeholder="0123456789" /></Field>
              <Field label="Secondary contact (optional)"><Input value={family.secondary_contact} onChange={(event) => setFamily({ ...family, secondary_contact: event.target.value })} /></Field>
              <Field label="Source (optional)"><Input value={family.source} onChange={(event) => setFamily({ ...family, source: event.target.value })} placeholder="Referral / Instagram / Walk-in" /></Field>
              <Field label="Internal note (Admin only)"><Textarea value={family.internal_notes} onChange={(event) => setFamily({ ...family, internal_notes: event.target.value })} placeholder="Admin-only context. Coaches cannot see this." /></Field>
            </div>
            <WizardActions primary="Save Family" secondary="Open family records" onSecondary={() => onOpenAdvanced('customers')} />
          </form>
        ) : null}
        {step === 1 ? (
          <form className="grid gap-3" onSubmit={saveStudent}>
            <WizardHeader title="Step 2: Add Student(s)" body="Add one student at a time. Health, safety, confidence, and consent are shown clearly later in the profile." />
            <CustomerPicker data={data} value={customerId} onChange={(value) => setContext((current) => ({ ...current, customerId: value }))} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Student name"><Input required value={student.display_name} onChange={(event) => setStudent({ ...student, display_name: event.target.value })} /></Field>
              <Field label="Age"><Input type="number" value={student.age} onChange={(event) => setStudent({ ...student, age: event.target.value })} /></Field>
              <Field label="Gender"><Select value={student.gender} onChange={(event) => setStudent({ ...student, gender: event.target.value })}><option value="">Optional</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select></Field>
              <Field label="Current Level 1-6"><Select value={student.level} onChange={(event) => setStudent({ ...student, level: event.target.value })}>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>Level {item}</option>)}</Select></Field>
              <Field label="Preferred language"><Input value={student.preferred_language} onChange={(event) => setStudent({ ...student, preferred_language: event.target.value })} placeholder="English / Chinese / Malay" /></Field>
              <Field label="Learning goal"><Textarea value={student.learning_goal} onChange={(event) => setStudent({ ...student, learning_goal: event.target.value })} placeholder="Water confidence, freestyle, or adult breaststroke confidence." /></Field>
              <Field label="Health notes / emergency note"><Textarea value={student.health_notes} onChange={(event) => setStudent({ ...student, health_notes: event.target.value })} placeholder="Asthma, medication, emergency note, or write None confirmed." /></Field>
              <Field label="Special needs / confidence"><Textarea value={student.special_needs} onChange={(event) => setStudent({ ...student, special_needs: event.target.value })} placeholder="Fear of water, nervous, mobility, or learning support." /></Field>
              <Field label="Safety alert"><Textarea value={student.safety_alert} onChange={(event) => setStudent({ ...student, safety_alert: event.target.value })} placeholder="Short warning shown prominently to coaches." /></Field>
              <Field label="Photo consent"><Select value={student.photo_consent_status} onChange={(event) => setStudent({ ...student, photo_consent_status: event.target.value })}>{['unknown', 'internal_only', 'marketing_approved', 'not_allowed'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Photo consent note"><Input value={student.photo_consent_note} onChange={(event) => setStudent({ ...student, photo_consent_note: event.target.value })} placeholder="Optional" /></Field>
            </div>
            <div className="rounded-lg bg-white p-3 text-sm text-slate-600">Students for this family: {customerStudents.map((item) => item.display_name).join(', ') || 'None yet'}</div>
            <div className="grid gap-2 sm:flex sm:flex-wrap"><Button className="w-full sm:w-auto">Save Student</Button><Button className="w-full sm:w-auto" type="button" variant="soft" onClick={() => setStep(2)}>Continue to Venue</Button><Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => onOpenAdvanced('students')}>Open student records</Button></div>
          </form>
        ) : null}
        {step === 2 ? (
          <form className="grid gap-3" onSubmit={saveVenue}>
            <WizardHeader title="Step 3: Add Venue / Address" body="Save where lessons happen. Coaches use this for maps, access notes, and lesson coordination." />
            <CustomerPicker data={data} value={customerId} onChange={(value) => setContext((current) => ({ ...current, customerId: value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Venue name"><Input value={venue.venue_name} onChange={(event) => setVenue({ ...venue, venue_name: event.target.value })} placeholder="Home pool / Condo pool" /></Field>
              <Field label="Area"><Input value={venue.area} onChange={(event) => setVenue({ ...venue, area: event.target.value })} /></Field>
              <Field label="Pool type"><Select value={venue.pool_type} onChange={(event) => setVenue({ ...venue, pool_type: event.target.value })}>{['home', 'condo', 'public', 'other'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Full address"><Textarea value={venue.full_address} onChange={(event) => setVenue({ ...venue, full_address: event.target.value })} /></Field>
              <Field label="Google Maps link"><Input value={venue.google_maps_link} onChange={(event) => setVenue({ ...venue, google_maps_link: event.target.value })} /></Field>
              <Field label="Access instruction"><Textarea value={venue.access_instruction} onChange={(event) => setVenue({ ...venue, access_instruction: event.target.value })} placeholder="Guard house, pool level, call parent first." /></Field>
              <Field label="Parking note"><Textarea value={venue.parking_note} onChange={(event) => setVenue({ ...venue, parking_note: event.target.value })} /></Field>
              <Field label="Pool depth / safety note"><Textarea value={venue.pool_depth_note} onChange={(event) => setVenue({ ...venue, pool_depth_note: event.target.value })} /></Field>
            </div>
            <WizardActions primary="Save Venue" secondary="Open venue records" onSecondary={() => onOpenAdvanced('venues')} />
          </form>
        ) : null}
        {step === 3 ? (
          <form className="grid gap-3" onSubmit={saveClass}>
            <WizardHeader title="Step 4: Create Class / Group" body="Choose the class type, coach, students, and whether the timing is fixed weekly or flexible." />
            <CustomerPicker data={data} value={customerId} onChange={(value) => setContext((current) => ({ ...current, customerId: value }))} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Class / group name"><Input value={clsForm.class_name} onChange={(event) => setClsForm({ ...clsForm, class_name: event.target.value })} /></Field>
              <Field label="Class type"><Select value={clsForm.class_type} onChange={(event) => setClsForm({ ...clsForm, class_type: event.target.value })}>{classTypes.map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Scheduling mode"><Select value={clsForm.scheduling_mode} onChange={(event) => setClsForm({ ...clsForm, scheduling_mode: event.target.value })}><option value="fixed_weekly">Fixed weekly</option><option value="flexible">Flexible / Coach-arranged</option></Select></Field>
              <Field label="Assigned coach"><Select value={clsForm.assigned_coach_id || ''} onChange={(event) => setClsForm({ ...clsForm, assigned_coach_id: event.target.value || null })}><option value="">Choose later</option>{data.coaches.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.coach_code}</option>)}</Select></Field>
              <Field label="Default venue"><Select value={context.venueId || ''} onChange={(event) => setContext((current) => ({ ...current, venueId: event.target.value }))}><option value="">Choose later</option>{data.venues.filter((item) => !customerId || item.customer_id === customerId).map((item) => <option key={item.id} value={item.id}>{item.venue_name || item.area || item.full_address}</option>)}</Select></Field>
              <Field label="Lesson duration"><Input type="number" value={clsForm.default_duration_minutes} onChange={(event) => setClsForm({ ...clsForm, default_duration_minutes: Number(event.target.value) })} /></Field>
              {clsForm.scheduling_mode === 'fixed_weekly' ? (
                <>
                  <Field label="Weekly day"><Select value={clsForm.day_of_week} onChange={(event) => setClsForm({ ...clsForm, day_of_week: event.target.value })}>{[['0', 'Sunday'], ['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
                  <Field label="Default start"><Input type="time" value={clsForm.fixed_start_time} onChange={(event) => setClsForm({ ...clsForm, fixed_start_time: event.target.value })} /></Field>
                  <Field label="Default end"><Input type="time" value={clsForm.fixed_end_time} onChange={(event) => setClsForm({ ...clsForm, fixed_end_time: event.target.value })} /></Field>
                </>
              ) : null}
              <label className="mt-7 flex items-center gap-2 text-sm font-medium text-slate-600"><input type="checkbox" checked={clsForm.photo_required} onChange={(event) => setClsForm({ ...clsForm, photo_required: event.target.checked })} /> Photo required</label>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-sm font-semibold text-slate-700">Students in this class</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {customerStudents.length === 0 ? <span className="text-sm text-slate-500">No students for this family yet.</span> : customerStudents.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={selectedStudentIds.includes(item.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} /> {item.display_name}</label>
                ))}
              </div>
            </div>
            <WizardActions primary="Save Class" secondary="Open class records" onSecondary={() => onOpenAdvanced('classes')} />
          </form>
        ) : null}
        {step === 4 ? (
          <form className="grid gap-3" onSubmit={savePackage}>
            <WizardHeader title="Step 5: Add Package" body="Set the shared package for this family/group. Group lessons deduct one lesson per completed group lesson after Admin approval." />
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Package type"><Select value={pkgForm.package_type} onChange={(event) => {
                const total = event.target.value === 'single' ? 1 : Number(event.target.value.split('_')[0]) || 8;
                setPkgForm({ ...pkgForm, package_type: event.target.value, total_lessons: total, remaining_lessons: total });
              }}>{packageTypes.map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Total lessons"><Input type="number" value={pkgForm.total_lessons} onChange={(event) => setPkgForm({ ...pkgForm, total_lessons: Number(event.target.value), remaining_lessons: Number(event.target.value) })} /></Field>
              <Field label="Remaining lessons"><Input type="number" value={pkgForm.remaining_lessons} onChange={(event) => setPkgForm({ ...pkgForm, remaining_lessons: Number(event.target.value) })} /></Field>
              <Field label="Start date"><Input type="date" value={pkgForm.start_date} onChange={(event) => setPkgForm({ ...pkgForm, start_date: event.target.value, payment_date: event.target.value })} /></Field>
              <Field label="Payment date"><Input type="date" value={pkgForm.payment_date} onChange={(event) => setPkgForm({ ...pkgForm, payment_date: event.target.value })} /></Field>
              <Field label="Validity months"><Input type="number" value={pkgForm.validity_months} onChange={(event) => setPkgForm({ ...pkgForm, validity_months: Number(event.target.value) })} /></Field>
              <Field label="Customer price (Admin only)"><Input type="number" value={pkgForm.amount} onChange={(event) => setPkgForm({ ...pkgForm, amount: event.target.value })} placeholder="Optional" /></Field>
              <Field label="Payment status"><Select value={pkgForm.payment_status} onChange={(event) => setPkgForm({ ...pkgForm, payment_status: event.target.value })}>{['pending', 'paid', 'partial', 'refunded', 'void'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Payment method"><Select value={pkgForm.payment_method} onChange={(event) => setPkgForm({ ...pkgForm, payment_method: event.target.value })}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</Select></Field>
            </div>
            <p className="rounded-lg bg-sky-50 p-3 text-sm leading-6 text-sky-800">Payment proof upload stays in Money &gt; Payments so private files remain Admin-only and easy to review.</p>
            <WizardActions primary="Save Package" secondary="Open package records" onSecondary={() => onOpenAdvanced('packages')} />
          </form>
        ) : null}
        {step === 5 ? (
          <form className="grid gap-3" onSubmit={saveLesson}>
            <WizardHeader title="Step 6: Schedule First Lesson" body="Create the first lesson appointment. Use Schedule later for recurring weekly generation or coach-arranged flexible lessons." />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Lesson date"><Input type="date" value={lessonForm.scheduled_date} onChange={(event) => setLessonForm({ ...lessonForm, scheduled_date: event.target.value })} /></Field>
              <Field label="Start time"><Input type="time" value={lessonForm.start_time} onChange={(event) => setLessonForm({ ...lessonForm, start_time: event.target.value })} /></Field>
              <Field label="End time"><Input type="time" value={lessonForm.end_time} onChange={(event) => setLessonForm({ ...lessonForm, end_time: event.target.value })} /></Field>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap"><Button className="w-full sm:w-auto">Schedule Lesson</Button><Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => go('/schedule')}>Open full Schedule</Button></div>
          </form>
        ) : null}
      </div>
    </Section>
  );
}

function WizardHeader({ title, body }) {
  return <div><h3 className="font-semibold text-slate-950 ty-wrap">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p></div>;
}

function WizardActions({ primary, secondary, onSecondary }) {
  return <div className="grid gap-2 sm:flex sm:flex-wrap"><Button className="w-full sm:w-auto">{primary}</Button><Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onSecondary}>{secondary}</Button></div>;
}

function CustomerPicker({ data, value, onChange }) {
  return (
    <Field label="Family / customer">
      <Select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose family</option>
        {data.customers.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.customer_code}</option>)}
      </Select>
    </Field>
  );
}

function buildStudentProfileContext(student, data) {
  const customer = data.customers.find((item) => item.id === student.customer_id);
  const classLinks = data.class_students.filter((item) => item.student_id === student.id && item.active !== false);
  const classes = classLinks.map((link) => data.classes.find((cls) => cls.id === link.class_id)).filter(Boolean);
  const primaryClass = classes.find((cls) => cls.status === 'active') || classes[0];
  const coach = data.coaches.find((item) => item.id === primaryClass?.assigned_coach_id);
  const venue = data.venues.find((item) => item.id === primaryClass?.default_venue_id) || data.venues.find((item) => item.customer_id === customer?.id);
  const packages = data.packages.filter((pkg) => pkg.customer_id === customer?.id || classes.some((cls) => cls.id === pkg.class_id));
  const activePackage = packages.find((pkg) => pkg.status === 'active') || packages[0];
  const lessonClassIds = new Set(classes.map((cls) => cls.id));
  const recentLessons = data.lessons
    .filter((lesson) => lessonClassIds.has(lesson.class_id) || data.lesson_participants.some((row) => row.lesson_id === lesson.id && row.student_id === student.id))
    .sort((a, b) => String(b.scheduled_date || '').localeCompare(String(a.scheduled_date || '')));
  const skillProfile = getStudentSkillProfile(student, data);
  const levelProgress = getLevelProgress(student, data, skillProfile.current_level);
  const payments = data.package_financials.filter((payment) => payment.customer_id === customer?.id || packages.some((pkg) => pkg.id === payment.package_id));
  return {
    data,
    student,
    customer,
    classes,
    primaryClass,
    coach,
    venue,
    packages,
    activePackage,
    recentLessons,
    payments,
    skillProfile,
    levelProgress,
    missingItems: missingStudentDataItems(student, data),
  };
}

function missingStudentDataItems(student, data) {
  const item = {
    student,
    customer: data.customers.find((row) => row.id === student.customer_id),
  };
  const links = data.class_students.filter((row) => row.student_id === student.id && row.active !== false);
  const classes = links.map((link) => data.classes.find((cls) => cls.id === link.class_id)).filter(Boolean);
  const cls = classes[0];
  const venue = data.venues.find((row) => row.id === cls?.default_venue_id) || data.venues.find((row) => row.customer_id === item.customer?.id);
  const pkg = data.packages.find((row) => row.class_id === cls?.id || row.customer_id === item.customer?.id);
  const skillProfile = data.student_skill_profiles.find((row) => row.student_id === student.id);
  const missing = [];
  if (!item.customer?.whatsapp) missing.push('WhatsApp');
  if (!student.age) missing.push('Age');
  if (!student.health_notes && !student.safety_alert) missing.push('Health confirmation');
  if (!venue?.full_address) missing.push('Venue address');
  if (!venue?.google_maps_link) missing.push('Map link');
  if (!cls?.assigned_coach_id) missing.push('Coach');
  if (!pkg) missing.push('Package');
  if (!student.photo_consent_status || student.photo_consent_status === 'unknown') missing.push('Photo consent');
  if (!skillProfile && !student.level) missing.push('Current level');
  return missing;
}

function photoConsentLabel(value) {
  return {
    unknown: 'Unknown',
    internal_only: 'Internal only',
    marketing_approved: 'Marketing approved',
    not_allowed: 'Not allowed',
  }[value] || 'Unknown';
}

function StudentProfilePage({ profile, pathInfo, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const student = data.students.find((item) => item.id === pathInfo.id);
  const [progressStudent, setProgressStudent] = useState(null);
  if (!student) return <Section title="Student not found" action={<Button variant="ghost" onClick={() => go('/students')}>Back to Students</Button>}><p className="text-sm text-slate-500">This student is not visible to your account or no longer exists.</p></Section>;
  const item = buildStudentProfileContext(student, data);
  const { customer, primaryClass, coach, venue, activePackage, skillProfile, levelProgress, recentLessons, payments, missingItems } = item;
  const whatsapp = customer?.whatsapp;
  const mapsLink = venue?.google_maps_link;
  const renewalWarning = activePackage && (Number(activePackage.remaining_lessons || 0) <= 1 || daysUntil(activePackage.expiry_date) <= 14);
  return (
    <div data-testid="student-profile-page" className="grid gap-5">
      <Section title={student.display_name || 'Student Profile'} action={<Button variant="ghost" onClick={() => go('/students')}>Back</Button>}>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-sky-700">{customer?.display_name || 'Family not set'}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{student.display_name || 'Unnamed student'}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Parent: {customer?.parent_name || '-'}{customer?.whatsapp ? ` / WhatsApp: ${customer.whatsapp}` : ''}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StudentLevelBadge student={student} data={data} />
              <StatusBadge value={student.status}>{student.status || 'active'}</StatusBadge>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${renewalWarning ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'}`}>{activePackage ? `${activePackage.remaining_lessons} lessons left` : 'No package'}</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-60 lg:grid-cols-1">
            <a className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold ${whatsapp ? 'border-sky-100 bg-sky-50 text-sky-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={whatsapp ? `https://wa.me/${String(whatsapp).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer">{whatsapp ? 'WhatsApp Parent' : 'No WhatsApp'}</a>
            <a className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold ${mapsLink ? 'border-slate-200 bg-white text-slate-700' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} href={mapsLink || undefined} target="_blank" rel="noreferrer">{mapsLink ? 'Open Map' : 'No map link'}</a>
          </div>
        </div>
      </Section>
      {missingItems.length ? (
        <Section title="Missing Data">
          <p className="mb-3 text-sm leading-6 text-slate-500">These items make daily operations smoother. Fill them when available.</p>
          <div className="flex flex-wrap gap-2">{missingItems.map((label) => <span key={label} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{label}</span>)}</div>
        </Section>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Safety">
          <div className="grid gap-3">
            {student.safety_alert ? <div className="rounded-lg border border-rose-100 bg-rose-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Safety alert</p><p className="mt-1 text-sm font-semibold leading-6 text-rose-800">{student.safety_alert}</p></div> : null}
            <Info label="Health notes" value={student.health_notes || 'Not confirmed yet'} />
            <Info label="Special needs / confidence" value={student.special_needs || '-'} />
            <Info label="Photo consent" value={<StatusBadge value={student.photo_consent_status || 'unknown'}>{photoConsentLabel(student.photo_consent_status)}</StatusBadge>} />
            {student.photo_consent_note ? <Info label="Consent note" value={student.photo_consent_note} /> : null}
          </div>
        </Section>
        <Section title="Lesson Setup">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Coach" value={coach?.display_name || coach?.coach_code || 'Not set'} />
            <Info label="Class type" value={primaryClass?.class_type || '-'} />
            <Info label="Schedule mode" value={primaryClass?.scheduling_mode === 'fixed_weekly' ? 'Fixed weekly' : primaryClass?.scheduling_mode === 'flexible' ? 'Flexible / Coach-arranged' : '-'} />
            <Info label="Photo required" value={primaryClass?.photo_required ? 'Yes' : 'No'} />
            <Info label="Venue" value={venue?.venue_name || venue?.area || '-'} />
            <Info label="Address" value={venue?.full_address || '-'} />
            <Info label="Access" value={venue?.access_instruction || '-'} />
            <Info label="Parking / pool note" value={[venue?.parking_note, venue?.pool_depth_note].filter(Boolean).join(' / ') || '-'} />
          </div>
        </Section>
        <Section title="Package">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Remaining" value={activePackage ? `${activePackage.remaining_lessons} lessons` : 'No package'} />
            <Info label="Used" value={activePackage ? `${activePackage.used_lessons || 0} / ${activePackage.total_lessons || 0}` : '-'} />
            <Info label="Expiry" value={activePackage?.expiry_date ? `${formatDate(activePackage.expiry_date)}${daysUntil(activePackage.expiry_date) < 0 ? ' (expired)' : ''}` : '-'} />
            <Info label="Status" value={activePackage ? <StatusBadge value={activePackage.status}>{activePackage.status}</StatusBadge> : '-'} />
          </div>
          {renewalWarning ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">Renewal follow-up recommended.</p> : null}
        </Section>
        <Section title="Progress" action={<Button variant="soft" onClick={() => setProgressStudent(student)}>Update Progress</Button>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Current level" value={`Level ${skillProfile.current_level}`} />
            <Info label="Level status" value={levelStatusLabels[skillProfile.level_status] || skillProfile.level_status} />
            <Info label="Current focus" value={skillProfile.current_focus || student.learning_goal || '-'} />
            <Info label="Last assessed" value={formatDate(skillProfile.last_assessed_at)} />
            <Info label="Passed criteria" value={`${levelProgress.passed}/${levelProgress.total}`} />
            <Info label="Assessment note" value={skillProfile.assessment_note || '-'} />
          </div>
        </Section>
      </div>
      <Section title="Recent Lessons">
        {recentLessons.length === 0 ? <EmptyState title="No lesson history yet" body="Scheduled and completed lessons will appear here after this student is linked to a class." /> : (
          <div className="grid gap-3">
            {recentLessons.slice(0, 5).map((lesson) => {
              const cls = data.classes.find((row) => row.id === lesson.class_id);
              const photos = data.lesson_photos.filter((photo) => photo.lesson_id === lesson.id);
              return (
                <button key={lesson.id} onClick={() => go(`/lessons/${lesson.id}`)} className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-sky-200 hover:bg-sky-50">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-sky-700">{formatDate(lesson.scheduled_date)} {lesson.start_time || ''}</p>
                      <p className="mt-1 font-semibold text-slate-950 ty-wrap">{cls?.class_name || lesson.lesson_code}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{lesson.coach_notes || 'No coach note yet.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2"><StatusBadge value={lesson.status}>{lesson.status}</StatusBadge><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{photos.length} photo{photos.length === 1 ? '' : 's'}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>
      {isAdmin ? (
        <Section title="Admin-only Finance">
          <p className="mb-3 text-sm leading-6 text-slate-500">This section is hidden from coaches. It contains customer price and payment records only.</p>
          {payments.length === 0 ? <EmptyState title="No payment records" body="Payment records can be added from Money > Payments or during package setup." /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold text-slate-950 ty-wrap">{formatMoney(payment.amount)}</p><p className="mt-1 text-sm text-slate-500 ty-wrap">{formatDate(payment.payment_date)} / {payment.payment_method || '-'}</p></div>
                    <StatusBadge value={payment.payment_status}>{payment.payment_status}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs break-all text-slate-500">{payment.proof_storage_path ? `Proof path: ${payment.proof_storage_path}` : 'No proof uploaded yet'}</p>
                </div>
              ))}
            </div>
          )}
          {customer?.internal_notes ? <div className="mt-3"><Info label="Internal notes" value={customer.internal_notes} /></div> : null}
        </Section>
      ) : null}
      {progressStudent ? <StudentProgressModal student={progressStudent} data={data} profile={profile} reload={reload} toast={toast} onClose={() => setProgressStudent(null)} /> : null}
    </div>
  );
}

function CustomersPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const allowedCustomerIds = new Set(data.classes.filter((cls) => cls.assigned_coach_id === coach?.id).map((cls) => cls.customer_id));
  const rows = isAdmin ? data.customers : data.customers.filter((customer) => allowedCustomerIds.has(customer.id));
  return (
    <RecordManager
      title="Customers / Families"
      table="customers"
      rows={rows}
      canEdit={isAdmin}
      addLabel="Add Family"
      reload={reload}
      toast={toast}
      onRowClick={(row) => go(`/customers/${row.id}`)}
      fields={[
        ['customer_code', 'Customer code'],
        ['display_name', 'Display name'],
        ['parent_name', 'Parent name'],
        ['whatsapp', 'WhatsApp', 'tel'],
        ['secondary_contact', 'Secondary contact'],
        ['source', 'Source'],
        ['status', 'Status', 'select', ['active', 'paused', 'completed', 'inactive', 'lost']],
        ['internal_notes', 'Internal notes', 'textarea', null, true],
      ]}
      columns={[
        ['customer_code', 'Code'],
        ['display_name', 'Name'],
        ['whatsapp', 'WhatsApp'],
        ['area', 'Area', (row) => data.venues.find((venue) => venue.customer_id === row.id)?.area || '-'],
        ['coach', 'Coach', (row) => coachNamesForCustomer(row.id, data)],
        ['status', 'Status', (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge>],
      ]}
    />
  );
}

function MoneyPage(props) {
  const [active, setActive] = useState('summary');
  const tabs = [
    ['summary', 'Summary'],
    ['payments', 'Payments'],
    ['payroll', 'Payroll'],
    ['expenses', 'Expenses'],
  ];
  const { data } = props;
  const month = todayISO().slice(0, 7);
  const payments = sumThisMonth(data.package_financials, 'payment_date', 'amount');
  const expenses = sumThisMonth(data.expenses, 'expense_date', 'amount');
  const salary = data.payroll_items.filter((row) => row.status !== 'void' && row.status !== 'paid').reduce((sum, row) => sum + Number(row.pay_amount || 0), 0);
  return (
    <div className="grid gap-5">
      <Section title="Money">
        <p className="text-sm leading-6 text-slate-500">Admin-only monthly records. Payments are money received from customers, Payroll is coach salary to pay, Expenses are business costs, and Summary is the simple monthly view for records/accounting.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-950 ty-wrap">Summary</p><p className="mt-1 text-sm text-slate-500 ty-wrap">Quick monthly picture.</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-950 ty-wrap">Payments</p><p className="mt-1 text-sm text-slate-500 ty-wrap">Money received from customers.</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-950 ty-wrap">Payroll</p><p className="mt-1 text-sm text-slate-500 ty-wrap">Coach salary to pay.</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-950 ty-wrap">Expenses</p><p className="mt-1 text-sm text-slate-500 ty-wrap">Business costs and receipts.</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map(([key, label]) => <Button key={key} variant={active === key ? 'primary' : 'ghost'} onClick={() => setActive(key)}>{label}</Button>)}
        </div>
      </Section>
      {active === 'summary' ? (
        <Section title={`Accounting Summary ${month}`}>
          <div className="grid gap-3 md:grid-cols-4">
            <Card title="Payments collected" value={formatMoney(payments)} tone="green" />
            <Card title="Expenses" value={formatMoney(expenses)} tone="rose" />
            <Card title="Coach salary payable" value={formatMoney(salary)} tone="amber" />
            <Card title="Estimated net" value={formatMoney(payments - expenses - salary)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => downloadCsv(`ty-payments-${month}.csv`, data.package_financials)}>Export payments</Button>
            <Button variant="ghost" onClick={() => downloadCsv(`ty-expenses-${month}.csv`, data.expenses)}>Export expenses</Button>
            <Button variant="ghost" onClick={() => downloadCsv(`ty-payroll-items-${month}.csv`, data.payroll_items)}>Export payroll</Button>
          </div>
        </Section>
      ) : null}
      {active === 'payments' ? <PaymentsPage {...props} /> : null}
      {active === 'payroll' ? <PayrollPage {...props} /> : null}
      {active === 'expenses' ? <ExpensesPage {...props} /> : null}
    </div>
  );
}

function MorePage(props) {
  const { signOut, profile, data, toast } = props;
  const isAdmin = profile.role === 'admin';
  const tools = [
    ...(isAdmin ? [['money', '/money', 'Money']] : []),
    ...legacyAdminRoutes.filter(([key]) => (isAdmin
      ? ['help', 'skill-levels', 'system-check', 'audit-logs', 'customers', 'venues', 'classes', 'packages', 'lessons', 'import', 'cleanup', 'reports', 'settings'].includes(key)
      : ['help', 'skill-levels', 'system-check'].includes(key))),
  ];
  return (
    <div data-testid="more-page" className="grid gap-5">
      <Section title="More">
        <p className="text-sm leading-6 text-slate-500">Advanced and occasional tools live here so the daily menu stays simple.</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {tools.map(([key, href, label]) => (
            <button key={key} onClick={() => go(href)} className="flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-sky-200 hover:bg-sky-50 sm:block sm:min-h-0 sm:p-4">
              <p className="font-semibold text-slate-950 ty-wrap">{!isAdmin && key === 'system-check' ? 'My Account Check' : label}</p>
              <p className="hidden text-sm text-slate-500 sm:mt-1 sm:block ty-wrap">{moreToolDescription(key, isAdmin)}</p>
              <span className="text-slate-300 sm:hidden">›</span>
            </button>
          ))}
          <button data-testid="sign-out-button" onClick={signOut} className="flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-left font-semibold text-rose-700 hover:bg-rose-100">
            Sign out / 登出
            <span className="text-rose-300">›</span>
          </button>
        </div>
      </Section>
      {isAdmin ? <Section title="Admin Tools">
        <p className="text-sm leading-6 text-slate-500">Use these before real operations or when checking sensitive changes.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => go('/settings')}>Open Settings</Button>
          <Button variant="ghost" onClick={() => go('/audit-logs')}>Audit Logs</Button>
          <Button variant="ghost" onClick={() => exportAllDataBackup(data, profile, toast)}>Export All Data JSON</Button>
        </div>
      </Section> : null}
    </div>
  );
}

function moreToolDescription(key, isAdmin = true) {
  return {
    money: 'Payments, payroll, expenses, and accounting summary.',
    help: 'Simple owner and coach guide for daily use.',
    'skill-levels': 'TY Swim Level 1-6 syllabus and student progress.',
    'system-check': isAdmin ? 'Check whether the OS is ready and see what to fix first.' : 'Check your coach account, assigned lessons, students, venues, and pay access.',
    'audit-logs': 'Read-only history of important Admin and system actions.',
    import: 'Bring in old Google Sheet CSV data.',
    cleanup: 'Find missing names, address, age, consent, coach, and proof records.',
    reports: 'Monthly lesson, renewal, payment, expense, and payroll exports.',
    settings: 'Users, coaches, rates, and system settings.',
    customers: 'Detailed customer list route.',
    venues: 'Venue list route.',
    classes: 'Class/group list route.',
    packages: 'Package list route.',
    lessons: 'Detailed lesson history route.',
  }[key] || 'Open tool';
}

function HelpPage({ profile }) {
  const isAdmin = profile?.role === 'admin';
  return (
    <div className="grid gap-5">
      <Section title="Help Guide">
        <p className="text-sm leading-6 text-slate-500">Use this page when you are unsure where to start. The OS is designed around daily work first: lessons today, coach submissions, student setup, schedule, and money.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card title="1. Start Today" value={isAdmin ? 'Admin' : 'Coach'} note={isAdmin ? 'Check pending lessons, reschedules, renewals, and missing data.' : 'Check class time, WhatsApp, map, safety notes, and submit records.'} />
          <Card title="2. Keep Records Current" value="Students" note={isAdmin ? 'Add the family, student, venue, class, package, then first lesson.' : 'Review your assigned students, contacts, venues, and health notes.'} />
          <Card title="3. Review Before Money" value="Review" note="Lessons only affect package counts and payroll after Admin approval." tone="amber" />
        </div>
      </Section>
      <Section title="Admin Daily Flow">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Today', 'Open Today first. It shows lessons, pending review, reschedule alerts, renewal reminders, replacement lessons, and missing data.'],
            ['Students', 'Use the guided setup steps for new families: family, student, venue, class, package, first lesson. Advanced tables are hidden until needed.'],
            ['Schedule', 'Use Fixed Weekly for regular classes and Flexible Lesson for coach-arranged appointments. Rescheduling one lesson does not change the whole weekly pattern.'],
            ['Review', 'Approve, request edit, or reject coach submissions. Approval is the moment package deduction and payroll creation happen.'],
            ['Money', 'Admin-only area for payments, payroll, expenses, and exports. Coaches do not see prices, payments, company income, or expenses.'],
            ['Setup Check', 'Run this after setup, demo seed, or any permission issue. It tells you what passed, what needs attention, and the next action.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-950 ty-wrap">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Coach Daily Flow">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Before class', 'Open Today. Check time, class, students, WhatsApp, map, venue, safety alert, and whether a photo is required.'],
            ['After class', 'Tap Submit Record. Choose attendance, add a short progress note and next focus, upload optional photo, then submit completed or cancelled.'],
            ['Approved lessons', 'Once Admin approves a lesson, it becomes read-only for Coach. Ask Admin if a correction is needed.'],
            ['My Pay', 'Coach sees only their own expected payroll from approved payable lessons, never other coaches or company finance.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-950 ty-wrap">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="If You Are Stuck">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => go('/dashboard')}>Open Today</Button>
          {isAdmin ? <Button variant="soft" onClick={() => go('/students')}>Setup Student</Button> : null}
          <Button variant="ghost" onClick={() => go('/system-check')}>Run Setup Check</Button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">For a full explanation, open docs/ty-swim-academy-os-user-guide.md in the repository. For external UX feedback, share docs/ty-swim-academy-os-ux-review-pack.md.</p>
      </Section>
    </div>
  );
}

function SkillLevelsPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const assignedClassIds = new Set(data.classes.filter((cls) => cls.assigned_coach_id === coach?.id).map((cls) => cls.id));
  const assignedStudentIds = new Set(data.class_students.filter((item) => assignedClassIds.has(item.class_id)).map((item) => item.student_id));
  const students = isAdmin ? data.students : data.students.filter((student) => assignedStudentIds.has(student.id));
  const [progressStudent, setProgressStudent] = useState(null);
  return (
    <div className="grid gap-5">
      <Section title="Levels & Progress">
        <p className="text-sm leading-6 text-slate-500">TY Swim Academy Level 1-6 syllabus. All students start with Level 1 water safety first. Adult learners may begin with breaststroke confidence work when mobility, fear, or stiffness makes freestyle too difficult at first.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skillLevels.map((level) => (
            <article key={level.level} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-sky-700">Level {level.level}</p>
                  <h3 className="mt-1 font-semibold text-slate-950 ty-wrap">{level.title}</h3>
                </div>
                <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">{level.criteria.length} skills</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{level.goal}</p>
              <details className="mt-3 rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">Teaching notes and checklist</summary>
                <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600">
                  <div><span className="font-semibold text-slate-800">Teaching focus:</span> {level.teachingFocus}</div>
                  <div><span className="font-semibold text-slate-800">Cue words:</span> {level.cues.join(' / ')}</div>
                  <div><span className="font-semibold text-slate-800">Common mistakes:</span> {level.commonMistakes.join(' / ')}</div>
                  <ul className="grid gap-1">
                    {level.criteria.map(([id, label]) => <li key={id}>- {label}</li>)}
                  </ul>
                </div>
              </details>
            </article>
          ))}
        </div>
      </Section>
      <Section title="Bonus / Optional Skills">
        <p className="mb-4 text-sm leading-6 text-slate-500">These are useful teaching tools but do not block the main level progression unless Admin decides.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {bonusSkills.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4"><p className="font-semibold text-slate-950 ty-wrap">{item.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p></div>)}
        </div>
      </Section>
      <Section title={isAdmin ? 'Student Progress' : 'My Student Progress'}>
        <StudentProgressCards students={students} data={data} onUpdate={setProgressStudent} />
      </Section>
      {progressStudent ? <StudentProgressModal student={progressStudent} data={data} profile={profile} reload={reload} toast={toast} onClose={() => setProgressStudent(null)} /> : null}
    </div>
  );
}

function SystemCheckPage({ session, profile, data, tableErrors = {} }) {
  const [bucketState, setBucketState] = useState({ loading: true, checks: [], error: '' });
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (profile?.role !== 'admin') {
        setBucketState({ loading: false, checks: [], error: '' });
        return;
      }
      const checks = await Promise.all(requiredStorageBuckets.map(async (name) => {
        const { error } = await supabase.storage.from(name).list('', { limit: 1 });
        return { name, ok: !error, detail: error?.message || 'Reachable' };
      }));
      if (cancelled) return;
      setBucketState({ loading: false, checks, error: '' });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const requiredTables = ['profiles', 'coaches', 'customers', 'students', 'venues', 'classes', 'packages', 'lessons', 'payroll_items', 'student_skill_profiles', 'student_skill_progress', 'lesson_skill_assessments'];
  const isAdmin = profile?.role === 'admin';
  const isCoach = profile?.role === 'coach';
  const ownCoach = data.coaches.find((coach) => coach.profile_id === profile?.id);
  const demoDataPresent = data.customers.some((item) => item.customer_code === 'DEMO-CUS-0001')
    && data.students.some((item) => item.student_code === 'DEMO-STU-0001')
    && data.classes.some((item) => item.class_code === 'DEMO-CLS-0001')
    && data.packages.some((item) => item.package_code === 'DEMO-PKG-0001')
    && data.lessons.some((item) => String(item.lesson_code || '').startsWith('DEMO-LES-'));
  const pendingReviewLesson = data.lessons.some((lesson) => lesson.status === 'completed_pending_review');
  const assignedLessonCount = ownCoach ? data.lessons.filter((lesson) => lesson.coach_id === ownCoach.id).length : 0;
  const assignedClassCount = ownCoach ? data.classes.filter((cls) => cls.assigned_coach_id === ownCoach.id).length : 0;
  const visiblePayrollForOtherCoach = isCoach && ownCoach ? data.payroll_items.some((item) => item.coach_id !== ownCoach.id) : false;
  if (isCoach) {
    return <CoachAccountCheck profile={profile} ownCoach={ownCoach} data={data} assignedLessonCount={assignedLessonCount} assignedClassCount={assignedClassCount} visiblePayrollForOtherCoach={visiblePayrollForOtherCoach} />;
  }
  const coachProfileExists = data.coaches.some((coach) => coach.profile_id);
  const frontendEnvKeys = Object.keys(import.meta.env || {});
  const serviceRoleExposed = frontendEnvKeys.some((key) => key.toLowerCase().includes('service_role'));
  const tableErrorSummary = Object.entries(tableErrors).map(([name, message]) => `${name}: ${message}`).join(' | ');
  const coreTablesOk = requiredTables.every((name) => Array.isArray(data[name]) && !tableErrors[name]);
  const skillTablesOk = ['student_skill_profiles', 'student_skill_progress', 'lesson_skill_assessments'].every((name) => Array.isArray(data[name]) && !tableErrors[name]);
  const baseRows = [
    checkRow('Supabase env loaded', hasSupabaseConfig ? 'pass' : 'fail', 'The app has the public Supabase URL and anon key.', 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.'),
    checkRow('Current session exists', session?.user?.id ? 'pass' : 'fail', session?.user?.email || 'No signed-in user session found.', 'Sign in again at /login.'),
    checkRow('Current profile exists', profile?.id ? 'pass' : 'fail', profile?.email || 'No profile row loaded.', 'Create a profiles row matching this Auth user ID.'),
    checkRow('Current role detected', ['admin', 'coach'].includes(profile?.role) ? 'pass' : 'fail', `Role: ${profile?.role || 'missing'}`, 'Set profile role to admin or coach.'),
    checkRow('Admin / Coach role logic', ['admin', 'coach'].includes(profile?.role) ? 'pass' : 'fail', `You are viewing ${profile?.role || 'unknown'} checks.`, 'Use Admin login for Admin checks and Coach login for Coach restriction checks.'),
    checkRow('Core tables accessible', coreTablesOk ? 'pass' : 'fail', tableErrorSummary || 'Core operational tables loaded.', 'Run supabase/schema.sql in the test Supabase project.'),
    checkRow('Skill progress ready', skillTablesOk ? 'pass' : 'fail', skillTablesOk ? 'Student Level 1-6 progress tables are available.' : tableErrorSummary || 'Skill progress tables could not be verified.', 'Run supabase/skill-progress-migration.sql, then refresh and rerun Setup Check.'),
    checkRow('Required storage buckets reachable', isAdmin ? (!bucketState.loading && bucketState.checks.every((item) => item.ok) ? 'pass' : 'fail') : 'warning', isAdmin ? (bucketState.loading ? 'Checking buckets...' : bucketState.checks.map((item) => `${item.name}: ${item.detail}`).join(' | ')) : 'Bucket reachability is checked from Admin because payment proofs and expense receipts are Admin-only.', 'If Admin sees a bucket failure, rerun supabase/schema.sql and confirm the private buckets exist: lesson-photos, payment-proofs, expense-receipts.'),
    checkRow('Demo data present', demoDataPresent ? 'pass' : 'warning', demoDataPresent ? 'DEMO customer, students, class, package, and lessons found.' : 'Demo rows not found yet.', 'Run supabase/demo-seed.sql after replacing the Admin and Coach Auth user IDs.'),
    checkRow('Pending review lesson exists', pendingReviewLesson ? 'pass' : 'warning', pendingReviewLesson ? 'A lesson is waiting for Admin review.' : 'No completed_pending_review lesson is visible.', 'Run demo-seed.sql or submit a lesson as Coach.'),
    checkRow('Coach profile exists', coachProfileExists ? 'pass' : 'warning', `${data.coaches.length} coach record(s), ${data.coaches.filter((coach) => coach.profile_id).length} linked to login profile.`, 'Create a coach row and link profile_id to the Coach Auth user.'),
    checkRow('No service_role key in frontend', serviceRoleExposed ? 'fail' : 'pass', serviceRoleExposed ? 'A service role-looking env variable is visible to the browser.' : 'Only public Vite env variables are available to the frontend.', 'Remove service_role keys from .env.local and Vercel frontend env. Use only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'),
  ];
  const adminRows = [
    checkRow('Admin profile active', isAdmin && profile?.active ? 'pass' : 'warning', isAdmin ? 'Current user is an active Admin.' : 'You are not signed in as Admin.', 'Sign in as Admin for Admin setup checks.'),
    checkRow('Payment data accessible to Admin', isAdmin && Array.isArray(data.package_financials) ? 'pass' : 'warning', `${data.package_financials.length} payment row(s) loaded.`, 'If this is not Admin, log in as Admin. If Admin sees an error, check package_financials RLS.'),
    checkRow('Expenses accessible to Admin', isAdmin && Array.isArray(data.expenses) ? 'pass' : 'warning', `${data.expenses.length} expense row(s) loaded.`, 'If Admin cannot load expenses, check expenses RLS.'),
    checkRow('Payroll accessible to Admin', isAdmin && Array.isArray(data.payroll_items) && Array.isArray(data.payroll_periods) ? 'pass' : 'warning', `${data.payroll_items.length} payroll item(s), ${data.payroll_periods.length} payroll period(s).`, 'Generate payroll after approving the demo lesson.'),
    checkRow('Coach restrictions need Coach login', isAdmin ? 'warning' : 'pass', isAdmin ? 'Admin cannot prove Coach RLS from this session.' : 'You are signed in as Coach.', 'Log in as Coach and open /system-check, then run npm run qa:check with Coach credentials.'),
  ];
  const coachRows = [
    checkRow('Coach profile linked', isCoach && ownCoach?.id ? 'pass' : 'warning', ownCoach?.coach_code || 'No coach row linked to this profile.', 'Set coaches.profile_id to this Coach Auth user ID.'),
    checkRow('Coach can see assigned lessons', isCoach && assignedLessonCount > 0 ? 'pass' : 'warning', `${assignedLessonCount} assigned lesson(s) visible.`, 'Run demo-seed.sql with this Coach Auth user ID or assign a class/lesson to this coach.'),
    checkRow('Coach can see assigned classes/students/venues', isCoach && assignedClassCount > 0 && data.students.length > 0 && data.venues.length > 0 ? 'pass' : 'warning', `${assignedClassCount} class(es), ${data.students.length} student(s), ${data.venues.length} venue(s) visible.`, 'Check class assignment and RLS if these are empty.'),
    checkRow('Payments hidden from Coach', !coachTableNames.includes('package_financials') ? 'pass' : 'fail', 'Coach loader does not request package_financials.', 'Keep payments out of coachTableNames and rely on RLS.'),
    checkRow('Expenses hidden from Coach', !coachTableNames.includes('expenses') ? 'pass' : 'fail', 'Coach loader does not request expenses.', 'Keep expenses out of coachTableNames and rely on RLS.'),
    checkRow('Customer price hidden from Coach', !coachTableNames.includes('package_financials') ? 'pass' : 'fail', 'Prices live in Admin-only package_financials.', 'Do not add price fields to coach-readable tables or coach UI.'),
    checkRow('Coach cannot see other coach payroll', visiblePayrollForOtherCoach ? 'fail' : 'pass', isCoach ? `${data.payroll_items.length} own payroll item(s) visible.` : 'Run this as Coach for a live RLS result.', 'Keep payroll RLS scoped by current_coach_id.'),
    checkRow('Coach cannot approve lesson', 'warning', 'This requires a live denied RPC attempt.', 'Run QA_RUN_MUTATIONS=true npm run qa:check with demo data to confirm approve_lesson rejects Coach.'),
    checkRow('Coach cannot edit approved lesson', 'warning', 'Protected by schema trigger prevent_coach_sensitive_lesson_update when schema.sql is applied.', 'Approve a demo lesson, log in as Coach, and confirm the lesson detail is read-only or run qa:check.'),
  ];
  const rows = [...baseRows, ...(isAdmin ? adminRows : coachRows)];
  const failCount = rows.filter((row) => row.status === 'fail').length;
  const warningCount = rows.filter((row) => row.status === 'warning').length;
  const setupTitle = failCount === 0 && warningCount === 0 ? 'Ready to use' : failCount > 0 ? `${failCount} thing${failCount === 1 ? '' : 's'} need fixing` : `${warningCount} thing${warningCount === 1 ? '' : 's'} need attention`;
  const setupBody = failCount === 0 && warningCount === 0
    ? 'Your OS is connected and ready for testing.'
    : rows.find((row) => row.status === 'fail')?.nextAction || rows.find((row) => row.status === 'warning')?.nextAction || 'Review the details below.';
  const counts = [
    ['Coaches', data.coaches.length],
    ['Customers', data.customers.length],
    ['Students', data.students.length],
    ['Classes', data.classes.length],
    ['Packages', data.packages.length],
    ['Lessons', data.lessons.length],
  ];
  return (
    <div className="grid gap-5">
      <Section title="Setup Check" action={<Button variant="ghost" onClick={() => setShowDetails((value) => !value)}>{showDetails ? 'Hide advanced details' : 'Show advanced details'}</Button>}>
        <div className={`min-w-0 rounded-lg border p-4 ${failCount ? 'border-rose-100 bg-rose-50' : warningCount ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
          <p className="text-lg font-semibold text-slate-950 ty-wrap">{setupTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700 ty-wrap">{setupBody}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card title="Passed" value={rows.filter((row) => row.status === 'pass').length} tone="green" />
          <Card title="Needs attention" value={warningCount} tone="amber" />
          <Card title="Needs fixing" value={failCount} tone="rose" />
        </div>
      </Section>
      {showDetails ? (
        <Section title="Advanced Details">
          <p className="mb-4 text-sm leading-6 text-slate-500 ty-wrap">These details are useful for setup and support. They include connection settings, role checks, private storage, table access, demo data, and security checks.</p>
          <DataTable rows={rows} columns={[
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{row.label}</StatusBadge> },
            { key: 'check', label: 'Check' },
            { key: 'detail', label: 'Result' },
            { key: 'nextAction', label: 'Next action' },
          ]} />
        </Section>
      ) : null}
      <Section title="Basic Data Counts">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {counts.map(([label, value]) => <Card key={label} title={label} value={value} tone={value > 0 ? 'sky' : 'amber'} />)}
        </div>
      </Section>
    </div>
  );
}

function CoachAccountCheck({ profile, ownCoach, data, assignedLessonCount, assignedClassCount, visiblePayrollForOtherCoach }) {
  const assignedStudentCount = data.students.length;
  const assignedVenueCount = data.venues.length;
  const financeHidden = data.package_financials.length === 0 && data.expenses.length === 0 && data.audit_logs.length === 0 && !visiblePayrollForOtherCoach;
  const rows = [
    checkRow('Account active', profile?.active ? 'pass' : 'fail', profile?.active ? 'Your coach account is active.' : 'Your coach account is not active.', 'Contact Admin.'),
    checkRow('Coach profile linked', ownCoach?.id ? 'pass' : 'fail', ownCoach?.display_name || ownCoach?.coach_code || 'Your coach profile is not linked yet.', 'Contact Admin.'),
    checkRow('Assigned lessons visible', assignedLessonCount > 0 ? 'pass' : 'warning', assignedLessonCount > 0 ? `${assignedLessonCount} assigned lesson(s) visible.` : 'No assigned lessons are visible yet.', 'If you expect lessons, contact Admin.'),
    checkRow('Assigned students visible', assignedStudentCount > 0 ? 'pass' : 'warning', assignedStudentCount > 0 ? `${assignedStudentCount} assigned student(s) visible.` : 'No assigned students are visible yet.', 'If you expect students, contact Admin.'),
    checkRow('Assigned venues visible', assignedVenueCount > 0 ? 'pass' : 'warning', assignedVenueCount > 0 ? `${assignedVenueCount} assigned venue(s) visible.` : 'No assigned venues are visible yet.', 'If you expect venue details, contact Admin.'),
    checkRow('My Pay access working', data.payroll_items.every((item) => !ownCoach?.id || item.coach_id === ownCoach.id) ? 'pass' : 'fail', data.payroll_items.length ? `${data.payroll_items.length} pay item(s) visible for your account.` : 'No pay records yet. Approved payable lessons will appear later.', 'If pay records look wrong, contact Admin.'),
    checkRow('Finance privacy protected', financeHidden ? 'pass' : 'fail', financeHidden ? 'Finance and admin-only records are hidden for privacy.' : 'Something private appears visible on this account.', 'Contact Admin before using real customer records.'),
  ];
  const failCount = rows.filter((row) => row.status === 'fail').length;
  const warningCount = rows.filter((row) => row.status === 'warning').length;
  const title = failCount ? 'Your coach account needs help.' : warningCount ? 'Your coach account is almost ready.' : 'Your coach account is ready.';
  const body = failCount
    ? 'Something needs Admin help before this account is ready.'
    : warningCount
      ? 'Your account works, but some assignments may not be added yet.'
      : 'You can see your assigned lessons and students. Finance and admin-only records are hidden for privacy.';
  return (
    <div data-testid="account-check-page" className="grid gap-5">
      <Section title="My Account Check">
        <div className={`rounded-lg border p-4 ${failCount ? 'border-rose-100 bg-rose-50' : warningCount ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
          <p className="text-lg font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">If something looks wrong, contact Admin.</p>
        </div>
      </Section>
      <Section title="What You Can Use">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => <CoachCheckCard key={row.id} row={row} />)}
        </div>
      </Section>
    </div>
  );
}

function CoachCheckCard({ row }) {
  const tone = row.status === 'pass' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : row.status === 'warning' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-rose-100 bg-rose-50 text-rose-700';
  const label = row.status === 'pass' ? 'Ready' : row.status === 'warning' ? 'Check' : 'Needs help';
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-950 ty-wrap">{row.check}</h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{row.detail}</p>
      {row.status !== 'pass' ? <p className="mt-2 text-sm font-medium text-slate-700">{row.nextAction}</p> : null}
    </article>
  );
}

function checkRow(check, status, detail, nextAction) {
  return {
    id: check,
    check,
    detail,
    nextAction,
    status,
    label: status === 'pass' ? 'Pass' : status === 'warning' ? 'Warning' : 'Fix',
  };
}

function CustomerDetail({ profile, pathInfo, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const customer = data.customers.find((item) => item.id === pathInfo.id);
  if (!customer) return <Section title="Customer not found"><Button variant="ghost" onClick={() => go('/customers')}>Back</Button></Section>;
  const students = data.students.filter((item) => item.customer_id === customer.id);
  const venues = data.venues.filter((item) => item.customer_id === customer.id);
  const classes = data.classes.filter((item) => item.customer_id === customer.id);
  const packages = data.packages.filter((item) => item.customer_id === customer.id);
  const lessons = data.lessons.filter((lesson) => classes.some((cls) => cls.id === lesson.class_id));
  const payments = data.package_financials.filter((payment) => payment.customer_id === customer.id);

  return (
    <div className="grid gap-5">
      <Section title={customer.display_name || customer.customer_code} action={<Button variant="ghost" onClick={() => go('/customers')}>Back</Button>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Parent" value={customer.parent_name} />
          <Info label="WhatsApp" value={customer.whatsapp} />
          <Info label="Status" value={<StatusBadge value={customer.status}>{customer.status}</StatusBadge>} />
          {isAdmin ? <Info label="Internal notes" value={customer.internal_notes || '-'} /> : null}
        </div>
      </Section>
      <Section title="Students">
        <DataTable rows={students} columns={[
          { key: 'student_code', label: 'Code' },
          { key: 'display_name', label: 'Name' },
          { key: 'skill_level', label: 'Skill Level', render: (row) => <StudentLevelBadge student={row} data={data} /> },
          { key: 'age', label: 'Age' },
          { key: 'legacy_level', label: 'Legacy Level', render: (row) => row.level || '-' },
          { key: 'alert', label: 'Health / Safety', render: (row) => row.safety_alert || row.health_notes || row.special_needs || '-' },
          { key: 'photo_consent_status', label: 'Photo Consent', render: (row) => <StatusBadge value={row.photo_consent_status || 'unknown'}>{row.photo_consent_status || 'unknown'}</StatusBadge> },
        ]} />
      </Section>
      <Section title="Skill Progress">
        <StudentProgressCards students={students} data={data} />
        <DataTable className="mt-4 hidden md:block" rows={data.lesson_skill_assessments.filter((row) => students.some((student) => student.id === row.student_id))} empty="No lesson skill assessments yet." columns={[
          { key: 'student', label: 'Student', render: (row) => data.students.find((student) => student.id === row.student_id)?.display_name || '-' },
          { key: 'level_number', label: 'Level' },
          { key: 'criterion_id', label: 'Skill' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{progressStatusLabels[row.status] || row.status}</StatusBadge> },
          { key: 'note', label: 'Note' },
          { key: 'created_at', label: 'When', render: (row) => formatDate(row.created_at) },
        ]} />
      </Section>
      <Section title="Venues / Address">
        <DataTable rows={venues} columns={[
          { key: 'venue_name', label: 'Venue' },
          { key: 'area', label: 'Area' },
          { key: 'full_address', label: 'Address' },
          { key: 'map', label: 'Map', render: (row) => row.google_maps_link ? <a className="font-semibold text-sky-700" href={row.google_maps_link} target="_blank" rel="noreferrer">Open</a> : '-' },
        ]} />
      </Section>
      <Section title="Classes / Groups">
        <DataTable rows={classes} columns={[
          { key: 'class_code', label: 'Code' },
          { key: 'class_name', label: 'Class' },
          { key: 'class_type', label: 'Type' },
          { key: 'scheduling_mode', label: 'Mode' },
          { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((coach) => coach.id === row.assigned_coach_id)?.display_name || '-' },
        ]} />
      </Section>
      <Section title="Packages">
        <DataTable rows={packages} columns={[
          { key: 'package_code', label: 'Code' },
          { key: 'package_type', label: 'Type' },
          { key: 'remaining_lessons', label: 'Remaining' },
          { key: 'expiry_date', label: 'Expiry' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge> },
        ]} />
      </Section>
      {isAdmin ? (
        <Section title="Payment History">
          <DataTable rows={payments} columns={[
            { key: 'payment_date', label: 'Date' },
            { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
            { key: 'payment_method', label: 'Method' },
            { key: 'payment_status', label: 'Status', render: (row) => <StatusBadge value={row.payment_status}>{row.payment_status}</StatusBadge> },
          ]} />
        </Section>
      ) : null}
      <LessonList title="Lesson History" rows={lessons} data={data} coachView={profile.role === 'coach'} />
      {isAdmin ? <ConsentQuickEdit customer={customer} students={students} data={data} reload={reload} toast={toast} /> : null}
    </div>
  );
}

function ConsentQuickEdit({ customer, students, data, reload, toast }) {
  const consent = data.consents.find((item) => item.customer_id === customer.id) || {};
  return (
    <Section title="Safety / Consent">
      <RecordForm
        table="consents"
        initial={{ customer_id: customer.id, marketing_photo_status: 'unknown', internal_photo_allowed: false, ...consent }}
        fields={[
          ['customer_id', 'Customer', 'hidden'],
          ['student_id', 'Student', 'select', [['', 'Family level'], ...students.map((student) => [student.id, student.display_name])]],
          ['internal_photo_allowed', 'Internal photo allowed', 'checkbox'],
          ['marketing_photo_status', 'Marketing photo', 'select', ['allowed', 'not_allowed', 'ask_first', 'unknown']],
          ['platforms_allowed', 'Platforms allowed', 'text'],
          ['consent_date', 'Consent date', 'date'],
          ['notes', 'Notes', 'textarea'],
        ]}
        onSaved={async () => {
          await reload();
          toast('Consent saved');
        }}
      />
    </Section>
  );
}

function StudentsPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const [progressStudent, setProgressStudent] = useState(null);
  const assignedClassIds = new Set(data.classes.filter((cls) => cls.assigned_coach_id === coach?.id).map((cls) => cls.id));
  const assignedStudentIds = new Set(data.class_students.filter((item) => assignedClassIds.has(item.class_id)).map((item) => item.student_id));
  const rows = isAdmin ? data.students : data.students.filter((student) => assignedStudentIds.has(student.id));
  return (
    <div className="grid gap-5">
      {isAdmin ? (
        <Section title="Student Level Progress">
          <p className="mb-4 text-sm leading-6 text-slate-500">Current TY Swim levels, focus, and assessment status for each student.</p>
          <StudentProgressCards students={rows} data={data} onUpdate={setProgressStudent} />
        </Section>
      ) : (
        <StudentProfileDirectory data={{ ...data, students: rows }} profile={profile} onUpdateProgress={setProgressStudent} />
      )}
      {isAdmin ? (
        <RecordManager
          title="Students"
          table="students"
          rows={rows}
          canEdit={isAdmin}
          addLabel="Add Student"
          reload={reload}
          toast={toast}
          fields={[
            ['student_code', 'Student code'],
            ['customer_id', 'Customer', 'select', data.customers.map((item) => [item.id, item.display_name || item.customer_code])],
            ['display_name', 'Display name'],
            ['age', 'Age', 'number'],
            ['gender', 'Gender', 'select', ['male', 'female', 'other']],
            ['level', 'Level'],
            ['learning_goal', 'Learning goal', 'textarea'],
            ['health_notes', 'Health notes', 'textarea'],
            ['special_needs', 'Special needs', 'textarea'],
            ['safety_alert', 'Safety alert', 'textarea'],
            ['photo_consent_status', 'Photo consent', 'select', ['unknown', 'internal_only', 'marketing_approved', 'not_allowed']],
            ['photo_consent_note', 'Photo consent note', 'textarea'],
            ['photo_consent_updated_at', 'Photo consent updated at', 'date'],
            ['preferred_language', 'Preferred language'],
            ['status', 'Status', 'select', ['active', 'paused', 'completed', 'inactive']],
          ]}
          columns={[
            ['student_code', 'Code'],
            ['display_name', 'Name'],
            ['customer', 'Customer', (row) => data.customers.find((item) => item.id === row.customer_id)?.display_name || '-'],
            ['level_progress', 'Level', (row) => <StudentLevelBadge student={row} data={data} />],
            ['focus', 'Focus', (row) => getStudentSkillProfile(row, data).current_focus || row.learning_goal || '-'],
            ['health', 'Health / Safety', (row) => row.safety_alert || row.health_notes || row.special_needs || '-'],
            ['photo_consent_status', 'Photo Consent', (row) => <StatusBadge value={row.photo_consent_status || 'unknown'}>{row.photo_consent_status || 'unknown'}</StatusBadge>],
            ['status', 'Status', (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge>],
          ]}
        />
      ) : null}
      {progressStudent ? <StudentProgressModal student={progressStudent} data={data} profile={profile} reload={reload} toast={toast} onClose={() => setProgressStudent(null)} /> : null}
    </div>
  );
}

function StudentProgressCards({ students, data, onUpdate, lesson }) {
  if (students.length === 0) return <EmptyState title="No students yet" body="Assigned students will appear here with their current level and focus." />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {students.map((student) => {
        const profile = getStudentSkillProfile(student, data);
        const level = getSkillLevel(profile.current_level);
        const progress = getLevelProgress(student, data, level.level);
        return (
          <article key={student.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950 ty-wrap">{student.display_name}</h3>
                <p className="mt-1 text-sm text-slate-500 ty-wrap">{data.customers.find((item) => item.id === student.customer_id)?.display_name || 'Family not set'}</p>
              </div>
              <StudentLevelBadge student={student} data={data} />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">Focus: {profile.current_focus || level.title}</p>
            <p className="mt-1 text-xs text-slate-500">Last assessed: {formatDate(profile.last_assessed_at)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-1 text-xs font-semibold text-sky-700">{progress.passed}/{progress.total} criteria passed</p>
            {student.safety_alert ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm font-medium text-rose-700">{student.safety_alert}</p> : null}
            <div className={`mt-4 grid gap-2 ${onUpdate ? 'sm:grid-cols-2' : ''}`}>
              {onUpdate ? <Button onClick={() => onUpdate(student)}>{lesson ? 'Update Progress' : 'Update Progress'}</Button> : null}
              <Button variant="ghost" onClick={() => go('/skill-levels')}>View Syllabus</Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StudentLevelBadge({ student, data }) {
  const profile = getStudentSkillProfile(student, data);
  return (
    <div className="grid justify-items-end gap-1">
      <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">Level {profile.current_level}</span>
      <StatusBadge value={profile.level_status}>{levelStatusLabels[profile.level_status] || profile.level_status}</StatusBadge>
    </div>
  );
}

function getStudentSkillProfile(student, data) {
  return data.student_skill_profiles.find((item) => item.student_id === student.id) || {
    student_id: student.id,
    current_level: Number(student.level || 1) || 1,
    level_status: 'not_started',
    current_focus: student.learning_goal || '',
    last_assessed_at: null,
    assessment_note: '',
    suggested_level_up: false,
  };
}

function getLevelProgress(student, data, levelNumber) {
  const level = getSkillLevel(levelNumber);
  const rows = data.student_skill_progress.filter((item) => item.student_id === student.id && Number(item.level_number) === Number(levelNumber));
  const passed = level.criteria.filter(([criterionId]) => rows.find((row) => row.criterion_id === criterionId)?.status === 'passed').length;
  const total = level.criteria.length;
  return { passed, total, percent: total ? Math.round((passed / total) * 100) : 0 };
}

function StudentProgressModal({ student, data, profile, reload, toast, onClose, lesson }) {
  const existingProfile = getStudentSkillProfile(student, data);
  const [levelNumber, setLevelNumber] = useState(Number(existingProfile.current_level || 1));
  const level = getSkillLevel(levelNumber);
  const existingRows = data.student_skill_progress.filter((item) => item.student_id === student.id && Number(item.level_number) === Number(levelNumber));
  const [statuses, setStatuses] = useState(() => Object.fromEntries(level.criteria.map(([criterionId]) => [criterionId, existingRows.find((row) => row.criterion_id === criterionId)?.status || 'not_started'])));
  const [notes, setNotes] = useState(() => Object.fromEntries(level.criteria.map(([criterionId]) => [criterionId, existingRows.find((row) => row.criterion_id === criterionId)?.note || ''])));
  const [levelStatus, setLevelStatus] = useState(existingProfile.level_status || 'learning');
  const [currentFocus, setCurrentFocus] = useState(existingProfile.current_focus || level.title);
  const [assessmentNote, setAssessmentNote] = useState(existingProfile.assessment_note || '');
  const [suggestLevelUp, setSuggestLevelUp] = useState(existingProfile.suggested_level_up || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const rows = data.student_skill_progress.filter((item) => item.student_id === student.id && Number(item.level_number) === Number(levelNumber));
    const nextLevel = getSkillLevel(levelNumber);
    setStatuses(Object.fromEntries(nextLevel.criteria.map(([criterionId]) => [criterionId, rows.find((row) => row.criterion_id === criterionId)?.status || 'not_started'])));
    setNotes(Object.fromEntries(nextLevel.criteria.map(([criterionId]) => [criterionId, rows.find((row) => row.criterion_id === criterionId)?.note || ''])));
    setCurrentFocus((value) => value || nextLevel.title);
  }, [levelNumber, student.id]);

  const passedCount = level.criteria.filter(([criterionId]) => statuses[criterionId] === 'passed').length;
  const readyForNext = passedCount === level.criteria.length;

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const profilePayload = {
      student_id: student.id,
      current_level: levelNumber,
      level_status: readyForNext ? 'passed' : levelStatus,
      current_focus: currentFocus,
      last_assessed_at: now,
      assessment_note: assessmentNote,
      suggested_level_up: suggestLevelUp || readyForNext,
      updated_by: profile.id,
    };
    const { error: profileError } = await supabase.from('student_skill_profiles').upsert(profilePayload, { onConflict: 'student_id' });
    if (profileError) {
      setSaving(false);
      toast(profileError.message);
      return;
    }
    const progressPayload = level.criteria.map(([criterionId]) => ({
      student_id: student.id,
      level_number: levelNumber,
      criterion_id: criterionId,
      status: statuses[criterionId] || 'not_started',
      note: notes[criterionId] || null,
      last_assessed_at: now,
      assessed_by: profile.id,
      lesson_id: lesson?.id || null,
    }));
    const { error: progressError } = await supabase.from('student_skill_progress').upsert(progressPayload, { onConflict: 'student_id,level_number,criterion_id' });
    if (progressError) {
      setSaving(false);
      toast(progressError.message);
      return;
    }
    if (lesson?.id) {
      const changed = progressPayload.filter((item) => item.status !== 'not_started' || item.note);
      if (changed.length) {
        const { error: assessmentError } = await supabase.from('lesson_skill_assessments').insert(changed.map((item) => ({
          lesson_id: lesson.id,
          student_id: student.id,
          level_number: levelNumber,
          criterion_id: item.criterion_id,
          status: item.status,
          note: item.note,
          next_focus: currentFocus,
          suggest_level_up: suggestLevelUp || readyForNext,
          assessed_by: profile.id,
        })));
        if (assessmentError) {
          setSaving(false);
          toast(assessmentError.message);
          return;
        }
      }
    }
    setSaving(false);
    toast('Student progress saved.');
    await reload();
    onClose();
  };

  return (
    <Modal title={`Update Progress - ${student.display_name}`} onClose={onClose} wide>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[160px_1fr_180px]">
          <Field label="Current level"><Select value={levelNumber} onChange={(event) => setLevelNumber(Number(event.target.value))}>{skillLevels.map((item) => <option key={item.level} value={item.level}>Level {item.level}</option>)}</Select></Field>
          <Field label="Current focus"><Input value={currentFocus} onChange={(event) => setCurrentFocus(event.target.value)} /></Field>
          <Field label="Level status"><Select value={levelStatus} onChange={(event) => setLevelStatus(event.target.value)}>{levelStatuses.map((item) => <option key={item} value={item}>{levelStatusLabels[item]}</option>)}</Select></Field>
        </div>
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
          <p className="font-semibold text-slate-950 ty-wrap">Level {level.level}: {level.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{level.goal}</p>
          <p className="mt-2 text-xs font-semibold text-sky-700">{passedCount}/{level.criteria.length} passed</p>
          {readyForNext ? <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-700">Ready for next level. Admin should confirm level up before changing the student level.</p> : null}
        </div>
        <div className="grid gap-3">
          {level.criteria.map(([criterionId, label]) => (
            <div key={criterionId} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-950 ty-wrap">{label}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {progressStatuses.map((status) => (
                  <button key={status} type="button" onClick={() => setStatuses((current) => ({ ...current, [criterionId]: status }))} className={`min-h-10 rounded-lg border px-2 text-sm font-semibold ${statuses[criterionId] === status ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {progressStatusLabels[status]}
                  </button>
                ))}
              </div>
              <Textarea className="mt-3 min-h-16" placeholder="Short note for this skill" value={notes[criterionId] || ''} onChange={(event) => setNotes((current) => ({ ...current, [criterionId]: event.target.value }))} />
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Assessment note"><Textarea value={assessmentNote} onChange={(event) => setAssessmentNote(event.target.value)} placeholder="Overall progress note. Chinese/English mixed notes are okay." /></Field>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={suggestLevelUp || readyForNext} onChange={(event) => setSuggestLevelUp(event.target.checked)} /> Suggest level up</label>
        </div>
        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] grid gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg lg:bottom-3 sm:flex sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Progress'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function VenuesPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const ownVenueIds = new Set(data.lessons.filter((lesson) => lesson.coach_id === coach?.id).map((lesson) => lesson.venue_id));
  const rows = isAdmin ? data.venues : data.venues.filter((venue) => ownVenueIds.has(venue.id));
  return (
    <RecordManager
      title="Venues"
      table="venues"
      rows={rows}
      canEdit={isAdmin}
      addLabel="Add Venue"
      reload={reload}
      toast={toast}
      fields={[
        ['customer_id', 'Customer', 'select', [['', 'No linked customer'], ...data.customers.map((item) => [item.id, item.display_name || item.customer_code])]],
        ['venue_name', 'Venue name'],
        ['full_address', 'Full address', 'textarea'],
        ['area', 'Area'],
        ['pool_type', 'Pool type', 'select', ['home', 'condo', 'public', 'other']],
        ['google_maps_link', 'Google Maps link'],
        ['parking_note', 'Parking note', 'textarea'],
        ['access_instruction', 'Access instruction', 'textarea'],
        ['entry_fee_note', 'Entry fee note', 'textarea'],
        ['pool_depth_note', 'Pool depth note', 'textarea'],
        ['venue_notes', 'Venue notes', 'textarea'],
        ['active', 'Active', 'checkbox'],
      ]}
      columns={[
        ['venue_name', 'Venue'],
        ['area', 'Area'],
        ['pool_type', 'Type'],
        ['full_address', 'Address'],
        ['map', 'Map', (row) => row.google_maps_link ? <a className="font-semibold text-sky-700" href={row.google_maps_link} target="_blank" rel="noreferrer">Open</a> : '-'],
      ]}
    />
  );
}

function ClassesPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const rows = isAdmin ? data.classes : data.classes.filter((cls) => cls.assigned_coach_id === coach?.id);
  const [studentModal, setStudentModal] = useState(null);
  return (
    <>
      <RecordManager
        title="Classes / Groups"
        table="classes"
        rows={rows}
        canEdit={isAdmin}
        addLabel="Add Class"
        reload={reload}
        toast={toast}
        extraAction={isAdmin ? (row) => <Button variant="soft" onClick={(event) => { event.stopPropagation(); setStudentModal(row); }}>Students</Button> : null}
        fields={[
          ['class_code', 'Class code'],
          ['customer_id', 'Customer', 'select', data.customers.map((item) => [item.id, item.display_name || item.customer_code])],
          ['class_name', 'Class name'],
          ['class_type', 'Class type', 'select', classTypes],
          ['scheduling_mode', 'Scheduling mode', 'select', ['fixed_weekly', 'flexible']],
          ['assigned_coach_id', 'Assigned coach', 'select', data.coaches.map((item) => [item.id, item.display_name || item.coach_code])],
          ['default_venue_id', 'Default venue', 'select', [['', 'None'], ...data.venues.map((item) => [item.id, item.venue_name || item.area])]],
          ['default_duration_minutes', 'Duration minutes', 'number'],
          ['photo_required', 'Photo required', 'checkbox'],
          ['status', 'Status', 'select', ['active', 'paused', 'completed', 'inactive']],
          ['notes', 'Notes', 'textarea'],
        ]}
        columns={[
          ['class_code', 'Code'],
          ['class_name', 'Class'],
          ['class_type', 'Type'],
          ['scheduling_mode', 'Schedule'],
          ['coach', 'Coach', (row) => data.coaches.find((item) => item.id === row.assigned_coach_id)?.display_name || '-'],
          ['students', 'Students', (row) => classStudentNames(row.id, data)],
          ['photo_required', 'Photo', (row) => row.photo_required ? 'Required' : 'Optional'],
          ['status', 'Status', (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge>],
        ]}
      />
      {studentModal ? <ClassStudentsModal cls={studentModal} data={data} reload={reload} toast={toast} onClose={() => setStudentModal(null)} /> : null}
    </>
  );
}

function ClassStudentsModal({ cls, data, reload, toast, onClose }) {
  const assigned = data.class_students.filter((item) => item.class_id === cls.id && item.active !== false);
  const [studentId, setStudentId] = useState(data.students[0]?.id || '');
  const add = async () => {
    const { error } = await supabase.from('class_students').insert({ class_id: cls.id, student_id: studentId, active: true });
    if (error) toast(error.message);
    else {
      toast('Student added');
      await reload();
    }
  };
  const remove = async (row) => {
    const { error } = await supabase.from('class_students').update({ active: false, left_at: todayISO() }).eq('id', row.id);
    if (error) toast(error.message);
    else {
      toast('Student removed from class');
      await reload();
    }
  };
  return (
    <Modal title={`Students in ${cls.class_name}`} onClose={onClose}>
      <div className="flex gap-2">
        <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>{data.students.map((student) => <option key={student.id} value={student.id}>{student.display_name}</option>)}</Select>
        <Button onClick={add}>Add</Button>
      </div>
      <div className="mt-4 grid gap-2">
        {assigned.map((row) => <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><span>{data.students.find((student) => student.id === row.student_id)?.display_name}</span><Button variant="danger" onClick={() => remove(row)}>Archive</Button></div>)}
      </div>
    </Modal>
  );
}

function PackagesPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const ownClassIds = new Set(data.classes.filter((cls) => cls.assigned_coach_id === coach?.id).map((cls) => cls.id));
  const rows = isAdmin ? data.packages : data.packages.filter((pkg) => ownClassIds.has(pkg.class_id));
  return (
    <RecordManager
      title="Packages"
      table="packages"
      rows={rows}
      canEdit={isAdmin}
      addLabel="Add Package"
      reload={reload}
      toast={toast}
      normalize={(form) => ({ ...form, expiry_date: form.expiry_date || derivePackageExpiry(form) })}
      fields={[
        ['package_code', 'Package code'],
        ['customer_id', 'Customer', 'select', data.customers.map((item) => [item.id, item.display_name || item.customer_code])],
        ['class_id', 'Class', 'select', data.classes.map((item) => [item.id, item.class_name || item.class_code])],
        ['package_type', 'Package type', 'select', packageTypes],
        ['total_lessons', 'Total lessons', 'number'],
        ['used_lessons', 'Used lessons', 'number'],
        ['remaining_lessons', 'Remaining lessons', 'number'],
        ['validity_months', 'Validity months', 'number'],
        ['start_date', 'Start date', 'date'],
        ['payment_date', 'Payment date', 'date'],
        ['expiry_date', 'Expiry date', 'date'],
        ['status', 'Status', 'select', ['active', 'completed', 'expired', 'paused', 'upgraded', 'transferred', 'void']],
        ['imported_from_legacy', 'Imported from legacy', 'checkbox'],
        ['notes', 'Notes', 'textarea'],
      ]}
      columns={[
        ['package_code', 'Code'],
        ['customer', 'Customer', (row) => data.customers.find((item) => item.id === row.customer_id)?.display_name || '-'],
        ['class', 'Class', (row) => data.classes.find((item) => item.id === row.class_id)?.class_name || '-'],
        ['package_type', 'Type'],
        ['remaining_lessons', 'Remaining'],
        ['expiry_date', 'Expiry'],
        ['status', 'Status', (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge>],
      ]}
    />
  );
}

function LessonsPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const [activeMode, setActiveMode] = useState('fixed_weekly');
  const [filters, setFilters] = useState({ dateFrom: todayISO().slice(0, 8) + '01', dateTo: '', coach: '', classId: '', status: '', pending: false, replacement: false });
  const [showFilters, setShowFilters] = useState(false);
  const [recurring, setRecurring] = useState(null);
  const [flexible, setFlexible] = useState(null);
  const rows = (isAdmin ? data.lessons : data.lessons.filter((lesson) => lesson.coach_id === coach?.id)).filter((lesson) => {
    return (!filters.dateFrom || lesson.scheduled_date >= filters.dateFrom)
      && (!filters.dateTo || lesson.scheduled_date <= filters.dateTo)
      && (!filters.coach || lesson.coach_id === filters.coach)
      && (!filters.classId || lesson.class_id === filters.classId)
      && (!filters.status || lesson.status === filters.status)
      && (!filters.pending || ['completed_pending_review', 'cancelled_pending_review'].includes(lesson.status))
      && (!filters.replacement || lesson.need_replacement);
  });
  const fixedSchedules = data.recurring_schedules.filter((schedule) => isAdmin || schedule.coach_id === coach?.id);
  const flexibleClasses = data.classes.filter((cls) => cls.scheduling_mode === 'flexible' && (isAdmin || cls.assigned_coach_id === coach?.id));
  const fixedLessons = rows.filter((lesson) => lesson.scheduling_mode === 'fixed_weekly');
  const flexibleLessons = rows.filter((lesson) => lesson.scheduling_mode === 'flexible');

  return (
    <div className="grid gap-5">
      <Section title="Schedule" action={<div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">{activeMode === 'fixed_weekly' && isAdmin ? <Button onClick={() => setRecurring({})}>Generate Upcoming Lessons</Button> : null}{activeMode === 'flexible' ? <Button onClick={() => setFlexible({})}>Create Flexible Lesson</Button> : null}<Button variant="ghost" onClick={() => setShowFilters((value) => !value)}>{showFilters ? 'Hide advanced filters' : 'Advanced filters'}</Button></div>}>
        <p className="text-sm leading-6 text-slate-500 ty-wrap">Choose one mode at a time. Fixed Weekly is for regular weekly classes. Flexible is for lessons arranged by coach and customer.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button className={`min-w-0 rounded-lg border p-4 text-left ${activeMode === 'fixed_weekly' ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50'}`} onClick={() => setActiveMode('fixed_weekly')}>
            <p className="font-semibold text-slate-950 ty-wrap">Fixed Weekly</p>
            <p className="mt-1 text-sm text-slate-600 ty-wrap">Regular weekly classes. Rescheduling one lesson does not change the weekly pattern.</p>
            <p className="mt-2 text-xs font-semibold text-sky-700 ty-wrap">{fixedSchedules.length} schedule(s), {fixedLessons.length} lesson(s)</p>
          </button>
          <button className={`min-w-0 rounded-lg border p-4 text-left ${activeMode === 'flexible' ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50'}`} onClick={() => setActiveMode('flexible')}>
            <p className="font-semibold text-slate-950 ty-wrap">Flexible / Coach-arranged</p>
            <p className="mt-1 text-sm text-slate-600 ty-wrap">Appointment-style lessons arranged with the customer in WhatsApp.</p>
            <p className="mt-2 text-xs font-semibold text-sky-700 ty-wrap">{flexibleClasses.length} class(es), {flexibleLessons.length} appointment(s)</p>
          </button>
        </div>
      </Section>
      {showFilters ? <Section title="Advanced Filters">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Field label="From"><Input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></Field>
          <Field label="To"><Input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></Field>
          <Field label="Coach"><Select value={filters.coach} onChange={(event) => setFilters({ ...filters, coach: event.target.value })}><option value="">All</option>{data.coaches.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</Select></Field>
          <Field label="Class"><Select value={filters.classId} onChange={(event) => setFilters({ ...filters, classId: event.target.value })}><option value="">All</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</Select></Field>
          <Field label="Status"><Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All</option>{['scheduled', 'rescheduled', 'completed_pending_review', 'cancelled_pending_review', 'needs_edit', 'approved', 'rejected', 'archived', 'void'].map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={filters.pending} onChange={(event) => setFilters({ ...filters, pending: event.target.checked })} /> Pending review</label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={filters.replacement} onChange={(event) => setFilters({ ...filters, replacement: event.target.checked })} /> Replacement</label>
        </div>
      </Section> : null}
      {activeMode === 'fixed_weekly' ? (
        <>
          <Section title="Fixed Weekly Schedules">
            <p className="mb-4 text-sm leading-6 text-slate-500">Use this for families/classes with the same usual day and time every week. Generated lesson occurrences can still be rescheduled one by one.</p>
            <FixedScheduleCardList rows={fixedSchedules} data={data} />
            <DataTable className="hidden md:block" rows={fixedSchedules} empty="No fixed weekly schedule yet." columns={[
              { key: 'class', label: 'Class', render: (row) => data.classes.find((cls) => cls.id === row.class_id)?.class_name || '-' },
              { key: 'day', label: 'Day', render: (row) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][row.day_of_week] || '-' },
              { key: 'time', label: 'Time', render: (row) => `${row.start_time || ''} - ${row.end_time || ''}` },
              { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-' },
              { key: 'venue', label: 'Venue', render: (row) => data.venues.find((item) => item.id === row.venue_id)?.venue_name || data.venues.find((item) => item.id === row.venue_id)?.area || '-' },
              { key: 'next', label: 'Next lesson', render: (row) => data.lessons.filter((lesson) => lesson.recurring_schedule_id === row.id && lesson.scheduled_date >= todayISO()).sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))[0]?.scheduled_date || '-' },
            ]} />
          </Section>
          <LessonList title="Upcoming Fixed Weekly Lessons" rows={fixedLessons} data={data} coachView={!isAdmin} empty="No fixed weekly lessons in this view." />
        </>
      ) : null}
      {activeMode === 'flexible' ? (
        <>
          <Section title="Flexible Classes Needing Appointment" action={<Button onClick={() => setFlexible({})}>Create Flexible Lesson</Button>}>
            <p className="mb-4 text-sm leading-6 text-slate-500">Use this for classes where coach and customer arrange each lesson time directly. Coach-created or rescheduled appointments appear for Admin attention.</p>
            <FlexibleClassCardList rows={flexibleClasses} data={data} onCreate={() => setFlexible({})} />
            <DataTable className="hidden md:block" rows={flexibleClasses} empty="No flexible classes." columns={[
              { key: 'class_name', label: 'Class / Group' },
              { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((item) => item.id === row.assigned_coach_id)?.display_name || '-' },
              { key: 'students', label: 'Students', render: (row) => classStudentNames(row.id, data) },
              { key: 'action', label: 'Action', render: () => <Button onClick={(event) => { event.stopPropagation(); setFlexible({}); }}>Create appointment</Button> },
            ]} />
          </Section>
          <LessonList title="Upcoming Flexible Lessons" rows={flexibleLessons} data={data} coachView={!isAdmin} empty="No flexible lessons in this view." />
        </>
      ) : null}
      {recurring ? <RecurringModal data={data} reload={reload} toast={toast} onClose={() => setRecurring(null)} /> : null}
      {flexible ? <FlexibleLessonModal profile={profile} data={data} reload={reload} toast={toast} onClose={() => setFlexible(null)} /> : null}
    </div>
  );
}

function FixedScheduleCardList({ rows, data }) {
  if (rows.length === 0) return <div className="md:hidden"><EmptyState title="No fixed weekly schedule yet" body="Create one when a class has a regular weekly day and time." /></div>;
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => {
        const cls = data.classes.find((item) => item.id === row.class_id);
        const coach = data.coaches.find((item) => item.id === row.coach_id);
        const venue = data.venues.find((item) => item.id === row.venue_id);
        const nextLesson = data.lessons.filter((lesson) => lesson.recurring_schedule_id === row.id && lesson.scheduled_date >= todayISO()).sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))[0];
        return (
          <article key={row.id} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sky-700">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][row.day_of_week] || '-'} · {row.start_time || ''} - {row.end_time || ''}</p>
                <h3 className="mt-1 font-semibold text-slate-950 ty-wrap">{cls?.class_name || '-'}</h3>
                <p className="mt-1 text-sm text-slate-500 ty-wrap">{coach?.display_name || '-'} · {venue?.venue_name || venue?.area || 'Venue not set'}</p>
              </div>
              <StatusBadge value={row.status}>{row.status}</StatusBadge>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ty-wrap">Next lesson: {nextLesson?.scheduled_date || '-'}</p>
          </article>
        );
      })}
    </div>
  );
}

function FlexibleClassCardList({ rows, data, onCreate }) {
  if (rows.length === 0) return <div className="md:hidden"><EmptyState title="No flexible classes" body="Flexible classes will appear here when they need appointments." /></div>;
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => (
        <article key={row.id} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-semibold text-slate-950 ty-wrap">{row.class_name}</p>
          <p className="mt-1 text-sm text-slate-500 ty-wrap">{data.coaches.find((item) => item.id === row.assigned_coach_id)?.display_name || 'Coach not set'}</p>
          <p className="mt-1 text-sm text-slate-600 ty-wrap">{classStudentNames(row.id, data)}</p>
          <Button className="mt-4 w-full" onClick={onCreate}>Create appointment</Button>
        </article>
      ))}
    </div>
  );
}

function RecurringModal({ data, reload, toast, onClose }) {
  const [schedule, setSchedule] = useState({ class_id: data.classes[0]?.id || '', coach_id: data.coaches[0]?.id || '', venue_id: data.venues[0]?.id || '', day_of_week: 1, start_time: '17:00', end_time: '18:00', active_from: todayISO(), status: 'active' });
  const [weeks, setWeeks] = useState(8);
  const save = async (event) => {
    event.preventDefault();
    const { data: saved, error } = await supabase.from('recurring_schedules').insert(schedule).select('*').single();
    if (error) {
      toast(error.message);
      return;
    }
    const { error: genError } = await supabase.rpc('generate_lessons_from_schedule', { p_schedule_id: saved.id, p_weeks: Number(weeks) });
    if (genError) toast(genError.message);
    else toast('Recurring schedule saved and upcoming lessons generated');
    await reload();
    onClose();
  };
  return (
    <Modal title="Create Fixed Weekly Schedule" onClose={onClose}>
      <form className="grid gap-3" onSubmit={save}>
        <p className="rounded-lg bg-sky-50 p-3 text-sm leading-6 text-sky-800">Generate weeks means how many upcoming weekly lesson appointments to create now. For example, 8 creates the next 8 weekly lessons. Rescheduling one generated lesson later will not change this weekly pattern.</p>
        <Field label="Class"><Select value={schedule.class_id} onChange={(event) => setSchedule({ ...schedule, class_id: event.target.value })}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</Select></Field>
        <Field label="Coach"><Select value={schedule.coach_id} onChange={(event) => setSchedule({ ...schedule, coach_id: event.target.value })}>{data.coaches.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</Select></Field>
        <Field label="Venue"><Select value={schedule.venue_id} onChange={(event) => setSchedule({ ...schedule, venue_id: event.target.value })}>{data.venues.map((item) => <option key={item.id} value={item.id}>{item.venue_name || item.area}</option>)}</Select></Field>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Day of week"><Select value={schedule.day_of_week} onChange={(event) => setSchedule({ ...schedule, day_of_week: Number(event.target.value) })}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((item, index) => <option key={item} value={index}>{item}</option>)}</Select></Field>
          <Field label="Start"><Input type="time" value={schedule.start_time} onChange={(event) => setSchedule({ ...schedule, start_time: event.target.value })} /></Field>
          <Field label="End"><Input type="time" value={schedule.end_time} onChange={(event) => setSchedule({ ...schedule, end_time: event.target.value })} /></Field>
          <Field label="Generate weeks"><Input type="number" min="1" max="24" value={weeks} onChange={(event) => setWeeks(event.target.value)} /></Field>
        </div>
        <Field label="Notes"><Textarea value={schedule.notes || ''} onChange={(event) => setSchedule({ ...schedule, notes: event.target.value })} /></Field>
        <Button>Create schedule</Button>
      </form>
    </Modal>
  );
}

function FlexibleLessonModal({ profile, data, reload, toast, onClose }) {
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const classOptions = profile.role === 'admin' ? data.classes.filter((item) => item.scheduling_mode === 'flexible') : data.classes.filter((item) => item.assigned_coach_id === coach?.id && item.scheduling_mode === 'flexible');
  const selectedClass = classOptions[0];
  const [lesson, setLesson] = useState({ class_id: selectedClass?.id || '', package_id: data.packages.find((pkg) => pkg.class_id === selectedClass?.id)?.id || '', coach_id: coach?.id || selectedClass?.assigned_coach_id || '', venue_id: selectedClass?.default_venue_id || '', scheduling_mode: 'flexible', scheduled_date: todayISO(), start_time: '17:00', end_time: '18:00', duration_minutes: 60, status: 'scheduled', count_package_lesson: true, coach_payable: true });
  const save = async (event) => {
    event.preventDefault();
    const code = `LES-${Date.now().toString().slice(-6)}`;
    const { data: inserted, error } = await supabase.from('lessons').insert({ ...lesson, lesson_code: code, created_by: profile.id, updated_by: profile.id }).select('*').single();
    if (error) {
      toast(error.message);
      return;
    }
    await supabase.from('lesson_change_logs').insert({ lesson_id: inserted.id, changed_by: profile.id, change_type: 'flexible_lesson_created', old_value: {}, new_value: lesson, reason: 'Coach/Admin created flexible lesson appointment' });
    toast('Flexible lesson created');
    await reload();
    onClose();
  };
  return (
    <Modal title="Create Flexible Lesson" onClose={onClose}>
      <form className="grid gap-3" onSubmit={save}>
        <Field label="Class"><Select value={lesson.class_id} onChange={(event) => {
          const cls = data.classes.find((item) => item.id === event.target.value);
          setLesson({ ...lesson, class_id: event.target.value, coach_id: cls?.assigned_coach_id || lesson.coach_id, venue_id: cls?.default_venue_id || lesson.venue_id, package_id: data.packages.find((pkg) => pkg.class_id === event.target.value)?.id || '' });
        }}>{classOptions.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</Select></Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Date"><Input type="date" value={lesson.scheduled_date} onChange={(event) => setLesson({ ...lesson, scheduled_date: event.target.value })} /></Field>
          <Field label="Start"><Input type="time" value={lesson.start_time} onChange={(event) => setLesson({ ...lesson, start_time: event.target.value })} /></Field>
          <Field label="End"><Input type="time" value={lesson.end_time} onChange={(event) => setLesson({ ...lesson, end_time: event.target.value })} /></Field>
        </div>
        <Field label="Coach notes"><Textarea value={lesson.coach_notes || ''} onChange={(event) => setLesson({ ...lesson, coach_notes: event.target.value })} /></Field>
        <Button>Create lesson</Button>
      </form>
    </Modal>
  );
}

function LessonDetail({ profile, pathInfo, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const lesson = data.lessons.find((item) => item.id === pathInfo.id);
  const [form, setForm] = useState(lesson || {});
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [participants, setParticipants] = useState([]);
  const [reverseModal, setReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  useEffect(() => {
    if (!lesson) return;
    const existing = data.lesson_participants.filter((item) => item.lesson_id === lesson.id);
    const clsStudents = data.class_students.filter((item) => item.class_id === lesson.class_id && item.active !== false);
    setParticipants(clsStudents.map((link) => existing.find((item) => item.student_id === link.student_id) || { lesson_id: lesson.id, student_id: link.student_id, attendance: 'present', progress_note: '', next_focus: '' }));
    setForm(lesson);
  }, [lesson?.id]);

  if (!lesson) return <Section title="Lesson not found"><Button variant="ghost" onClick={() => go('/lessons')}>Back</Button></Section>;
  const cls = data.classes.find((item) => item.id === lesson.class_id);
  const customer = data.customers.find((item) => item.id === cls?.customer_id);
  const venue = data.venues.find((item) => item.id === lesson.venue_id);
  const approved = lesson.status === 'approved';
  const coachLocked = !isAdmin && ['approved', 'void', 'rejected', 'archived'].includes(lesson.status);

  const saveLesson = async () => {
    const updates = { ...form, updated_by: profile.id };
    const oldSchedule = { scheduled_date: lesson.scheduled_date, start_time: lesson.start_time, end_time: lesson.end_time };
    const newSchedule = { scheduled_date: updates.scheduled_date, start_time: updates.start_time, end_time: updates.end_time };
    if (JSON.stringify(oldSchedule) !== JSON.stringify(newSchedule)) {
      if (!rescheduleReason.trim()) {
        toast('Please add a reschedule reason');
        return false;
      }
      updates.status = lesson.status === 'approved' ? 'approved' : 'rescheduled';
    }
    const { error } = await supabase.from('lessons').update(updates).eq('id', lesson.id);
    if (error) {
      toast(error.message);
      return false;
    }
    if (JSON.stringify(oldSchedule) !== JSON.stringify(newSchedule)) {
      await supabase.from('lesson_change_logs').insert({ lesson_id: lesson.id, changed_by: profile.id, change_type: 'reschedule', old_value: oldSchedule, new_value: newSchedule, reason: rescheduleReason, admin_seen: isAdmin });
    }
    for (const item of participants) {
      if (item.id) await supabase.from('lesson_participants').update(item).eq('id', item.id);
      else await supabase.from('lesson_participants').insert(item);
    }
    toast('Lesson saved');
    await reload();
    return true;
  };

  const submitReview = async (status = 'completed_pending_review') => {
    const saved = await saveLesson();
    if (!saved) return;
    const { error } = await supabase.from('lessons').update({ status, coach_submitted_at: new Date().toISOString(), updated_by: profile.id }).eq('id', lesson.id);
    if (error) toast(error.message);
    else {
      toast('Record submitted for Admin review.');
      await reload();
    }
  };

  const approve = async () => {
    const { error } = await supabase.rpc('approve_lesson', { p_lesson_id: lesson.id });
    if (error) toast(error.message);
    else {
      toast('Lesson approved, package/payroll updated once');
      await reload();
    }
  };

  const reviewUpdate = async (status) => {
    const { error } = await supabase.from('lessons').update({ status, admin_reviewed_at: new Date().toISOString(), admin_reviewed_by: profile.id, updated_by: profile.id }).eq('id', lesson.id);
    if (error) toast(error.message);
    else {
      toast('Review updated');
      await reload();
    }
  };
  const reverseApproval = async () => {
    if (!reverseReason.trim()) {
      toast('Please add a reversal reason.');
      return;
    }
    const { error } = await supabase.rpc('reverse_approved_lesson', { p_lesson_id: lesson.id, p_reason: reverseReason.trim() });
    if (error) toast(error.message);
    else {
      toast('Approval reversed safely.');
      setReverseModal(false);
      setReverseReason('');
      await reload();
    }
  };

  if (!isAdmin) {
    return (
      <CoachLessonSubmission
        lesson={lesson}
        profile={profile}
        cls={cls}
        customer={customer}
        venue={venue}
        data={data}
        form={form}
        setForm={setForm}
        participants={participants}
        setParticipants={setParticipants}
        rescheduleReason={rescheduleReason}
        setRescheduleReason={setRescheduleReason}
        coachLocked={coachLocked}
        saveLesson={saveLesson}
        submitReview={submitReview}
        reload={reload}
        toast={toast}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <Section title={lesson.lesson_code || 'Lesson'} action={<Button variant="ghost" onClick={() => go('/lessons')}>Back</Button>}>
        <div className="grid gap-3 md:grid-cols-4">
          <Info label="Class" value={cls?.class_name} />
          <Info label="Customer WhatsApp" value={customer?.whatsapp} />
          <Info label="Venue" value={venue?.full_address || venue?.venue_name} />
          <Info label="Status" value={<StatusBadge value={lesson.status} />} />
          <Info label="Health / safety" value={studentAlerts(cls, data) || '-'} />
          <Info label="Photo check-in" value={cls?.photo_required || lesson.photo_required ? 'Required' : 'Optional'} />
        </div>
      </Section>
      <Section title="Schedule and Lesson Controls">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Date"><Input disabled={coachLocked} type="date" value={form.scheduled_date || ''} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} /></Field>
          <Field label="Start"><Input disabled={coachLocked} type="time" value={form.start_time || ''} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></Field>
          <Field label="End"><Input disabled={coachLocked} type="time" value={form.end_time || ''} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></Field>
          <Field label="Duration"><Input disabled={coachLocked} type="number" value={form.duration_minutes || 60} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} /></Field>
        </div>
        <Field label="Reschedule reason"><Input disabled={coachLocked} value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} placeholder="Required when date/time changes" /></Field>
        {isAdmin ? (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.count_package_lesson || false} onChange={(event) => setForm({ ...form, count_package_lesson: event.target.checked })} /> Count package lesson</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.coach_payable || false} onChange={(event) => setForm({ ...form, coach_payable: event.target.checked })} /> Coach payable</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.need_replacement || false} onChange={(event) => setForm({ ...form, need_replacement: event.target.checked })} /> Replacement needed</label>
          </div>
        ) : null}
      </Section>
      <Section title="Attendance and Progress">
        <div className="grid gap-3">
          {participants.map((item, index) => {
            const student = data.students.find((row) => row.id === item.student_id);
            return (
              <div key={item.student_id} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_160px_1.3fr_1.3fr]">
                <div><p className="font-semibold text-slate-950 ty-wrap">{student?.display_name}</p><p className="text-xs text-rose-600">{student?.safety_alert || student?.health_notes || student?.special_needs || ''}</p></div>
                <Select disabled={coachLocked} value={item.attendance} onChange={(event) => setParticipants(participants.map((row, rowIndex) => rowIndex === index ? { ...row, attendance: event.target.value } : row))}>{['present', 'absent', 'sick', 'late', 'no_show', 'not_applicable'].map((value) => <option key={value}>{value}</option>)}</Select>
                <Textarea disabled={coachLocked} placeholder="Progress note" value={item.progress_note || ''} onChange={(event) => setParticipants(participants.map((row, rowIndex) => rowIndex === index ? { ...row, progress_note: event.target.value } : row))} />
                <Textarea disabled={coachLocked} placeholder="Next focus" value={item.next_focus || ''} onChange={(event) => setParticipants(participants.map((row, rowIndex) => rowIndex === index ? { ...row, next_focus: event.target.value } : row))} />
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Notes and Photos">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Coach notes"><Textarea disabled={coachLocked} value={form.coach_notes || ''} onChange={(event) => setForm({ ...form, coach_notes: event.target.value })} /></Field>
          {isAdmin ? <Field label="Admin notes"><Textarea value={form.admin_notes || ''} onChange={(event) => setForm({ ...form, admin_notes: event.target.value })} /></Field> : null}
        </div>
        <LessonPhotos lesson={lesson} profile={profile} data={data} reload={reload} toast={toast} canDelete />
      </Section>
      <LessonApprovalPanel isAdmin={isAdmin} lesson={lesson} onSave={saveLesson} onSubmit={submitReview} onApprove={approve} onReviewUpdate={reviewUpdate} onReverse={() => setReverseModal(true)} disabled={coachLocked} />
      {isAdmin ? <AuditPanels lesson={lesson} data={data} /> : null}
      {reverseModal ? (
        <Modal title="Void / Reverse Approval" onClose={() => setReverseModal(false)}>
          <div className="grid gap-4">
            <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">This will restore one package lesson only if this approval deducted it, and void the unpaid payroll item if one exists. If payroll was already paid, the system will block automatic reversal.</p>
            <Field label="Reason"><Textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} placeholder="Required. Example: approved wrong lesson date." /></Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReverseModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={reverseApproval}>Reverse approval</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function CoachLessonSubmission({ lesson, profile, cls, customer, venue, data, form, setForm, participants, setParticipants, rescheduleReason, setRescheduleReason, coachLocked, saveLesson, submitReview, reload, toast }) {
  const photoRequired = Boolean(cls?.photo_required || lesson.photo_required);
  const [showScheduleChange, setShowScheduleChange] = useState(false);
  const [outcome, setOutcome] = useState(lesson.status === 'cancelled_pending_review' ? 'cancelled' : 'completed');
  const submitted = ['completed_pending_review', 'cancelled_pending_review'].includes(lesson.status);
  const lessonStudents = participants.map((item) => data.students.find((student) => student.id === item.student_id)).filter(Boolean);
  return (
    <div className="grid gap-5">
      <Section title={cls?.class_name || lesson.lesson_code} action={<Button variant="ghost" onClick={() => go('/schedule')}>Back</Button>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Time" value={`${lesson.scheduled_date} ${lesson.start_time || ''} - ${lesson.end_time || ''}`} />
          <Info label="Students" value={classStudentNames(cls?.id, data)} />
          <Info label="Status" value={<StatusBadge value={lesson.status} />} />
          <Info label="WhatsApp" value={customer?.whatsapp || '-'} />
          <Info label="Venue" value={venue?.full_address || venue?.venue_name || '-'} />
          <Info label="Photo" value={photoRequired ? <StatusBadge value="needs_edit">Required</StatusBadge> : 'Optional'} />
        </div>
        {studentAlerts(cls, data) ? <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">Safety alert: {studentAlerts(cls, data)}</p> : <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">No health/safety alerts recorded.</p>}
      </Section>
      <Section title={coachLocked ? 'Read-only Lesson Record' : 'Submit Lesson Record'}>
        {coachLocked ? <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{lesson.status === 'approved' ? 'Approved - no further action needed.' : 'This lesson is closed.'} This lesson is read-only.</p> : null}
        {submitted && !coachLocked ? <p className="mb-4 rounded-lg bg-sky-50 p-3 text-sm font-semibold text-sky-700">Record submitted for Admin review.</p> : null}
        {!coachLocked ? (
          <div className="mb-4 grid gap-3 rounded-lg border border-sky-100 bg-sky-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Lesson result">
              <Select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                <option value="completed">Lesson completed</option>
                <option value="cancelled">Lesson cancelled</option>
              </Select>
            </Field>
            <Button type="button" variant="ghost" onClick={() => setShowScheduleChange((value) => !value)}>{showScheduleChange ? 'Hide date/time change' : 'Change date/time'}</Button>
          </div>
        ) : null}
        {showScheduleChange ? (
          <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <Field label="Lesson date"><Input disabled={coachLocked} type="date" value={form.scheduled_date || ''} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} /></Field>
            <Field label="Start time"><Input disabled={coachLocked} type="time" value={form.start_time || ''} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></Field>
            <Field label="End time"><Input disabled={coachLocked} type="time" value={form.end_time || ''} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></Field>
            <Field label="Reschedule reason"><Input disabled={coachLocked} value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} placeholder="Required if time changed" /></Field>
          </div>
        ) : null}
        <div className="grid gap-3">
          {participants.map((item, index) => {
            const student = data.students.find((row) => row.id === item.student_id);
            return (
              <div key={item.student_id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950 ty-wrap">{student?.display_name}</p>
                    <p className="text-xs text-rose-600">{student?.safety_alert || student?.health_notes || student?.special_needs || ''}</p>
                  </div>
                  <Select disabled={coachLocked} value={item.attendance} onChange={(event) => setParticipants(participants.map((row, rowIndex) => rowIndex === index ? { ...row, attendance: event.target.value } : row))}>{['present', 'absent', 'sick', 'late', 'no_show', 'not_applicable'].map((value) => <option key={value}>{value}</option>)}</Select>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Textarea disabled={coachLocked} placeholder="Short progress note" value={item.progress_note || ''} onChange={(event) => setParticipants(participants.map((row, rowIndex) => rowIndex === index ? { ...row, progress_note: event.target.value } : row))} />
                  <Textarea disabled={coachLocked} placeholder="Next focus" value={item.next_focus || ''} onChange={(event) => setParticipants(participants.map((row, rowIndex) => rowIndex === index ? { ...row, next_focus: event.target.value } : row))} />
                </div>
              </div>
            );
          })}
        </div>
        <Field label="Coach note"><Textarea disabled={coachLocked} value={form.coach_notes || ''} onChange={(event) => setForm({ ...form, coach_notes: event.target.value })} placeholder="Optional note for Admin" /></Field>
        <LessonPhotos lesson={lesson} profile={profile} data={data} reload={reload} toast={toast} disabled={coachLocked} />
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950 ty-wrap">Update student progress</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Optional. Quickly update 1-2 current focus skills. Full checklist stays in Levels & Progress.</p>
            </div>
            <Button variant="ghost" onClick={() => go('/skill-levels')}>View full syllabus</Button>
          </div>
          <CoachQuickProgress students={lessonStudents} lesson={lesson} data={data} profile={profile} reload={reload} toast={toast} disabled={coachLocked} />
        </div>
        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/70 backdrop-blur lg:bottom-3">
          <Button variant="ghost" onClick={saveLesson} disabled={coachLocked}>Save draft</Button>
          <Button data-testid="coach-submit-record-button" className="min-h-12 flex-1 text-base sm:flex-none" onClick={() => submitReview(outcome === 'cancelled' ? 'cancelled_pending_review' : 'completed_pending_review')} disabled={coachLocked}>Submit Record</Button>
        </div>
      </Section>
    </div>
  );
}

function CoachQuickProgress({ students, lesson, data, profile, reload, toast, disabled }) {
  if (students.length === 0) return <EmptyState title="No students linked" body="Add students to the class before recording progress." />;
  return (
    <div className="mt-3 grid gap-3">
      {students.map((student) => <CoachQuickProgressCard key={student.id} student={student} lesson={lesson} data={data} profile={profile} reload={reload} toast={toast} disabled={disabled} />)}
    </div>
  );
}

function CoachQuickProgressCard({ student, lesson, data, profile, reload, toast, disabled }) {
  const skillProfile = getStudentSkillProfile(student, data);
  const level = getSkillLevel(skillProfile.current_level);
  const existingRows = data.student_skill_progress.filter((item) => item.student_id === student.id && Number(item.level_number) === Number(level.level));
  const focusCriteria = level.criteria
    .filter(([criterionId]) => existingRows.find((row) => row.criterion_id === criterionId)?.status !== 'passed')
    .slice(0, 2);
  const criteria = focusCriteria.length ? focusCriteria : level.criteria.slice(0, 2);
  const [statusMap, setStatusMap] = useState(() => Object.fromEntries(criteria.map(([criterionId]) => [criterionId, existingRows.find((row) => row.criterion_id === criterionId)?.status || 'learning'])));
  const [note, setNote] = useState('');
  const [focus, setFocus] = useState(skillProfile.current_focus || criteria[0]?.[1] || level.title);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const progressPayload = criteria.map(([criterionId]) => ({
      student_id: student.id,
      level_number: level.level,
      criterion_id: criterionId,
      status: statusMap[criterionId] || 'learning',
      note: note || null,
      last_assessed_at: now,
      assessed_by: profile.id,
      lesson_id: lesson.id,
    }));
    const { error: profileError } = await supabase.from('student_skill_profiles').upsert({
      student_id: student.id,
      current_level: level.level,
      level_status: Object.values(statusMap).some((value) => value === 'almost' || value === 'passed') ? 'almost_ready' : 'learning',
      current_focus: focus,
      last_assessed_at: now,
      assessment_note: note || skillProfile.assessment_note || '',
      suggested_level_up: skillProfile.suggested_level_up || false,
      updated_by: profile.id,
    }, { onConflict: 'student_id' });
    if (profileError) {
      setSaving(false);
      toast(profileError.message);
      return;
    }
    const { error: progressError } = await supabase.from('student_skill_progress').upsert(progressPayload, { onConflict: 'student_id,level_number,criterion_id' });
    if (progressError) {
      setSaving(false);
      toast(progressError.message);
      return;
    }
    const { error: assessmentError } = await supabase.from('lesson_skill_assessments').insert(progressPayload.map((item) => ({
      lesson_id: lesson.id,
      student_id: student.id,
      level_number: level.level,
      criterion_id: item.criterion_id,
      status: item.status,
      note: item.note,
      next_focus: focus,
      suggest_level_up: false,
      assessed_by: profile.id,
    })));
    if (assessmentError) {
      setSaving(false);
      toast(assessmentError.message);
      return;
    }
    setSaving(false);
    toast(`Progress saved for ${student.display_name}`);
    await reload();
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 ty-wrap">{student.display_name}</p>
          <p className="text-sm text-slate-500">Level {level.level}: {level.title}</p>
        </div>
        <StudentLevelBadge student={student} data={data} />
      </div>
      <div className="mt-3 grid gap-2">
        {criteria.map(([criterionId, label]) => (
          <div key={criterionId} className="rounded-lg bg-slate-50 p-2">
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['learning', 'almost', 'passed'].map((status) => (
                <button key={status} type="button" disabled={disabled} onClick={() => setStatusMap((current) => ({ ...current, [criterionId]: status }))} className={`min-h-10 rounded-lg border px-2 text-sm font-semibold disabled:opacity-60 ${statusMap[criterionId] === status ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {progressStatusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        <Input disabled={disabled} value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Next focus" />
        <Textarea disabled={disabled} className="min-h-16" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional progress note" />
        <Button disabled={disabled || saving} onClick={save}>{saving ? 'Saving...' : 'Save progress'}</Button>
      </div>
    </article>
  );
}

function LessonPhotos({ lesson, profile, data, reload, toast, disabled = false, canDelete = false }) {
  const [type, setType] = useState('attendance_proof');
  const isAdmin = profile?.role === 'admin';
  const photoTypes = isAdmin ? ['attendance_proof', 'progress_record', 'pool_issue', 'marketing_candidate', 'other'] : ['attendance_proof', 'progress_record', 'pool_issue', 'other'];
  const photos = data.lesson_photos?.filter((photo) => photo.lesson_id === lesson.id) || [];
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const path = `${lesson.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('lesson-photos').upload(path, file, { upsert: false });
    if (error) {
      toast(error.message);
      return;
    }
    await supabase.from('lesson_photos').insert({ lesson_id: lesson.id, uploaded_by: profile?.id || null, storage_path: path, photo_type: type, usage: 'internal' });
    toast('Photo uploaded');
    await reload();
  };
  const remove = async (photo) => {
    if (!window.confirm('Delete this lesson photo?')) return;
    const storageResult = await supabase.storage.from('lesson-photos').remove([photo.storage_path]);
    if (storageResult.error) {
      toast(storageResult.error.message);
      return;
    }
    const { error } = await supabase.from('lesson_photos').delete().eq('id', photo.id);
    if (error) toast(error.message);
    else {
      toast('Photo deleted');
      await reload();
    }
  };
  const updateUsage = async (photo, usage) => {
    const { error } = await supabase.from('lesson_photos').update({ usage }).eq('id', photo.id);
    if (error) toast(error.message);
    else {
      toast('Photo usage updated');
      await reload();
    }
  };
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select disabled={disabled} value={type} onChange={(event) => setType(event.target.value)}>{photoTypes.map((item) => <option key={item}>{item}</option>)}</Select>
        <Input disabled={disabled} type="file" accept="image/*" onChange={upload} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="rounded-lg bg-slate-50 p-3 text-sm">
            <StoragePreview bucket="lesson-photos" path={photo.storage_path} image />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700">{photo.photo_type}</span>
              <StatusBadge value={photo.usage || 'internal'}>{photo.usage || 'internal'}</StatusBadge>
              {isAdmin ? <Select value={photo.usage || 'internal'} onChange={(event) => updateUsage(photo, event.target.value)}>{['internal', 'marketing_candidate', 'marketing_approved'].map((item) => <option key={item}>{item}</option>)}</Select> : null}
              {canDelete ? <Button variant="danger" onClick={() => remove(photo)}>Delete</Button> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonApprovalPanel({ isAdmin, lesson, onSave, onSubmit, onApprove, onReviewUpdate, onReverse, disabled }) {
  return (
    <Section title="Lesson Approval">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onSave} disabled={disabled}>Save changes</Button>
        {!isAdmin ? <Button onClick={() => onSubmit('completed_pending_review')} disabled={disabled}>Submit completed lesson</Button> : null}
        {!isAdmin ? <Button variant="soft" onClick={() => onSubmit('cancelled_pending_review')} disabled={disabled}>Submit cancellation</Button> : null}
        {isAdmin ? <Button onClick={onApprove} disabled={['approved', 'void'].includes(lesson.status)}>Approve and apply package/payroll</Button> : null}
        {isAdmin && lesson.status === 'approved' ? <Button variant="danger" onClick={onReverse}>Void / Reverse approval</Button> : null}
        {isAdmin ? <Button variant="soft" onClick={() => onReviewUpdate('needs_edit')}>Request edit</Button> : null}
        {isAdmin ? <Button variant="danger" onClick={() => onReviewUpdate('rejected')}>Reject</Button> : null}
      </div>
      <p className="mt-3 text-sm text-slate-500">Only approved lessons with package/payroll toggles enabled affect remaining lessons and coach pay.</p>
    </Section>
  );
}

function AuditPanels({ lesson, data }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Section title="Lesson Change Logs">
        <DataTable rows={data.lesson_change_logs.filter((item) => item.lesson_id === lesson.id)} columns={[
          { key: 'change_type', label: 'Type' },
          { key: 'reason', label: 'Reason' },
          { key: 'created_at', label: 'When', render: (row) => formatDate(row.created_at) },
        ]} />
      </Section>
      <Section title="Audit Logs">
        <DataTable rows={(data.audit_logs || []).filter((item) => item.entity_id === lesson.id)} columns={[
          { key: 'action', label: 'Action' },
          { key: 'entity_type', label: 'Entity' },
          { key: 'created_at', label: 'When', render: (row) => formatDate(row.created_at) },
        ]} />
      </Section>
    </div>
  );
}

function ReviewPage({ data, reload, toast }) {
  const [active, setActive] = useState('pending');
  const [showTable, setShowTable] = useState(false);
  const groups = {
    pending: data.lessons.filter((lesson) => lesson.status === 'completed_pending_review'),
    rescheduled: data.lessons.filter((lesson) => data.lesson_change_logs.some((log) => log.lesson_id === lesson.id && !log.admin_seen)),
    cancelled: data.lessons.filter((lesson) => lesson.status === 'cancelled_pending_review'),
    needs_edit: data.lessons.filter((lesson) => lesson.status === 'needs_edit'),
    missing_photos: data.lessons.filter((lesson) => {
      const cls = data.classes.find((item) => item.id === lesson.class_id);
      return cls?.photo_required && !data.lesson_photos.some((photo) => photo.lesson_id === lesson.id);
    }),
  };
  const rows = groups[active] || [];
  const approve = async (lesson) => {
    const { error } = await supabase.rpc('approve_lesson', { p_lesson_id: lesson.id });
    if (error) toast(error.message);
    else {
      toast('Lesson approved');
      await reload();
    }
  };
  const updateStatus = async (lesson, status) => {
    const { error } = await supabase.from('lessons').update({ status, admin_reviewed_at: new Date().toISOString(), admin_reviewed_by: (await supabase.auth.getUser()).data.user?.id }).eq('id', lesson.id);
    if (error) toast(error.message);
    else {
      toast('Review updated');
      await reload();
    }
  };
  return (
    <div className="grid gap-5">
      <Section title="Review">
        <p className="text-sm leading-6 text-slate-500">Use this like an approval inbox. Each card shows what Admin needs before approving, requesting an edit, or rejecting.</p>
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          {[
            ['pending', 'Pending lesson records'],
            ['rescheduled', 'Rescheduled lessons'],
            ['cancelled', 'Cancelled lessons'],
            ['needs_edit', 'Needs edit'],
            ['missing_photos', 'Missing required photos'],
          ].map(([key, label]) => <Button key={key} className="whitespace-nowrap" variant={active === key ? 'primary' : 'ghost'} onClick={() => setActive(key)}>{label} ({groups[key].length})</Button>)}
        </div>
      </Section>
      <Section title="Approval Inbox" action={<Button variant="ghost" onClick={() => setShowTable((value) => !value)}>{showTable ? 'Hide detailed records' : 'Show detailed records'}</Button>}>
        {rows.length === 0 ? <EmptyState title="No review needed" body="This category is clear. New coach submissions and schedule changes will appear here." /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((lesson) => {
              const cls = data.classes.find((item) => item.id === lesson.class_id);
              const coach = data.coaches.find((item) => item.id === lesson.coach_id);
              const pkg = data.packages.find((item) => item.id === lesson.package_id);
              const photoCount = (data.lesson_photos || []).filter((photo) => photo.lesson_id === lesson.id).length;
              const photoRequired = cls?.photo_required && photoCount === 0;
              return (
                <article key={lesson.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-sky-700">{formatDate(lesson.scheduled_date)} {lesson.start_time || ''}</p>
                      <h3 className="mt-1 font-semibold text-slate-950 ty-wrap">{cls?.class_name || lesson.lesson_code}</h3>
                      <p className="mt-1 text-sm text-slate-500 ty-wrap">{classStudentNames(cls?.id, data)}</p>
                    </div>
                    <StatusBadge value={lesson.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">Coach:</span> {coach?.display_name || '-'}</p>
                    <p><span className="font-semibold text-slate-800">Package:</span> {pkg?.package_code || 'No linked package'}{pkg ? `, ${pkg.remaining_lessons} lesson(s) left` : ''}</p>
                    <p><span className="font-semibold text-slate-800">Notes:</span> {lesson.coach_notes || 'No coach note'}</p>
                    <p><span className="font-semibold text-slate-800">Photos:</span> {photoRequired ? <StatusBadge value="needs_edit">Missing required photo</StatusBadge> : `${photoCount} uploaded`}</p>
                  </div>
                  <p className={`mt-4 rounded-lg p-3 text-sm font-medium ${lesson.status === 'cancelled_pending_review' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'}`}>{approvalImpactText(lesson)}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
                    <Button className="w-full xl:w-auto" onClick={() => approve(lesson)}>Approve</Button>
                    <Button className="w-full xl:w-auto" variant="soft" onClick={() => updateStatus(lesson, 'needs_edit')}>Request edit</Button>
                    <Button className="w-full xl:w-auto" variant="danger" onClick={() => updateStatus(lesson, 'rejected')}>Reject</Button>
                    <Button className="w-full xl:w-auto" variant="ghost" onClick={() => go(`/lessons/${lesson.id}`)}>Open</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {showTable ? (
          <div className="mt-4">
            <DataTable rows={rows} empty="No pending review in this category." onRowClick={(row) => go(`/lessons/${row.id}`)} columns={[
              { key: 'lesson_code', label: 'Lesson' },
              { key: 'date', label: 'Date', render: (row) => `${row.scheduled_date} ${row.start_time || ''}` },
              { key: 'class', label: 'Class', render: (row) => data.classes.find((cls) => cls.id === row.class_id)?.class_name || '-' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
              { key: 'photo', label: 'Photo', render: (row) => {
                const cls = data.classes.find((item) => item.id === row.class_id);
                const count = (data.lesson_photos || []).filter((photo) => photo.lesson_id === row.id).length;
                return cls?.photo_required && count === 0 ? <StatusBadge value="needs_edit">Missing required</StatusBadge> : count;
              } },
              { key: 'action', label: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button onClick={(event) => { event.stopPropagation(); approve(row); }}>Approve</Button><Button variant="soft" onClick={(event) => { event.stopPropagation(); updateStatus(row, 'needs_edit'); }}>Request edit</Button><Button variant="danger" onClick={(event) => { event.stopPropagation(); updateStatus(row, 'rejected'); }}>Reject</Button></div> },
            ]} />
          </div>
        ) : null}
      </Section>
    </div>
  );
}

function approvalImpactText(lesson) {
  const packageText = lesson.count_package_lesson ? 'deduct 1 lesson from the package' : 'not deduct a package lesson';
  const payrollText = lesson.coach_payable ? 'create one coach payroll item' : 'not create a coach payroll item';
  if (lesson.status === 'cancelled_pending_review') return `Approving this cancellation will ${packageText} and ${payrollText}, based on the current lesson flags.`;
  return `Approving this lesson will ${packageText} and ${payrollText}.`;
}

function PayrollPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const items = isAdmin ? data.payroll_items : data.payroll_items.filter((item) => item.coach_id === coach?.id);
  const periods = isAdmin ? data.payroll_periods : data.payroll_periods.filter((period) => period.coach_id === coach?.id);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const unpaidItems = items.filter((item) => !['paid', 'void'].includes(item.status));
  const paidItems = items.filter((item) => item.status === 'paid');
  const generate = async () => {
    const { error } = await supabase.rpc('generate_monthly_payroll', { p_period_month: `${month}-01` });
    if (error) toast(error.message);
    else {
      toast('Payroll generated');
      await reload();
    }
  };
  const markPaid = async (period) => {
    if (!window.confirm('Mark this payroll paid and create coach salary expense?')) return;
    const { error } = await supabase.rpc('mark_payroll_paid', { p_period_id: period.id });
    if (error) toast(error.message);
    else {
      toast('Payroll paid and expense created once');
      await reload();
    }
  };
  return (
    <div data-testid={isAdmin ? 'payroll-page' : 'coach-pay-page'} className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title={isAdmin ? 'Payable now' : 'Expected pay'} value={formatMoney(unpaidItems.reduce((sum, item) => sum + Number(item.pay_amount || 0), 0))} tone="amber" />
        <Card title="Approved lessons" value={items.length} />
        <Card title="Paid items" value={paidItems.length} tone="green" />
      </div>
      <Section title={isAdmin ? 'Generate Payroll' : 'My Expected Payroll'} action={isAdmin ? <div className="flex gap-2"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><Button onClick={generate}>Generate</Button><Button variant="ghost" onClick={() => downloadCsv(`ty-payroll-${month}.csv`, items)}>Export CSV</Button></div> : null}>
        {!isAdmin ? <p className="mb-4 text-sm leading-6 text-slate-500">This shows approved lessons that count toward your pay. Payments marked paid will appear as paid here.</p> : null}
        <PayrollPeriodCards rows={periods} data={data} isAdmin={isAdmin} markPaid={markPaid} />
        <DataTable className="hidden md:block" rows={periods} columns={[
          { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-' },
          { key: 'period_month', label: 'Month', render: (row) => formatDate(row.period_month).slice(0, 7) },
          { key: 'total_lessons', label: 'Lessons' },
          { key: 'total_amount', label: 'Amount', render: (row) => formatMoney(row.total_amount) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge> },
          { key: 'action', label: 'Action', render: (row) => isAdmin && row.status !== 'paid' ? <Button onClick={() => markPaid(row)}>Mark paid</Button> : '-' },
        ]} />
      </Section>
      <Section title="Payroll Items">
        <PayrollItemCards rows={items} data={data} />
        <DataTable className="hidden md:block" rows={items} columns={[
          { key: 'lesson', label: 'Lesson', render: (row) => data.lessons.find((item) => item.id === row.lesson_id)?.lesson_code || '-' },
          { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-' },
          { key: 'pay_amount', label: 'Amount', render: (row) => formatMoney(row.pay_amount) },
          { key: 'rate_source', label: 'Rate source' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge> },
        ]} />
      </Section>
    </div>
  );
}

function PayrollPeriodCards({ rows, data, isAdmin, markPaid }) {
  if (rows.length === 0) return <div className="md:hidden"><EmptyState title="No payroll yet" body="Approved payable lessons will appear here after payroll is generated." /></div>;
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => (
        <article key={row.id} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950 ty-wrap">{formatDate(row.period_month).slice(0, 7)}</p>
              <p className="mt-1 text-sm text-slate-500 ty-wrap">{data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-'}</p>
            </div>
            <StatusBadge value={row.status}>{row.status}</StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Info label="Lessons" value={row.total_lessons} />
            <Info label="Amount" value={formatMoney(row.total_amount)} />
          </div>
          {isAdmin && row.status !== 'paid' ? <Button className="mt-3 w-full" onClick={() => markPaid(row)}>Mark paid</Button> : null}
        </article>
      ))}
    </div>
  );
}

function PayrollItemCards({ rows, data }) {
  if (rows.length === 0) return <div className="md:hidden"><EmptyState title="No payroll items yet" body="Approved payable lessons will show here." /></div>;
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => (
        <article key={row.id} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950 ty-wrap">{data.lessons.find((item) => item.id === row.lesson_id)?.lesson_code || 'Lesson'}</p>
              <p className="mt-1 text-sm text-slate-500 ty-wrap">{data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-'}</p>
            </div>
            <StatusBadge value={row.status}>{row.status}</StatusBadge>
          </div>
          <p className="mt-3 text-xl font-semibold text-slate-950">{formatMoney(row.pay_amount)}</p>
          <p className="mt-1 text-sm text-slate-500 ty-wrap">Rate source: {row.rate_source || '-'}</p>
        </article>
      ))}
    </div>
  );
}

function PaymentsPage({ data, reload, toast }) {
  return (
    <RecordManager
      title="Payments"
      table="package_financials"
      rows={data.package_financials}
      canEdit
      addLabel="Add Payment"
      reload={reload}
      toast={toast}
      uploadBucket="payment-proofs"
      fields={[
        ['package_id', 'Package', 'select', data.packages.map((item) => [item.id, item.package_code])],
        ['customer_id', 'Customer', 'select', data.customers.map((item) => [item.id, item.display_name || item.customer_code])],
        ['amount', 'Amount', 'number'],
        ['payment_date', 'Payment date', 'date'],
        ['payment_method', 'Method', 'select', paymentMethods],
        ['payment_status', 'Status', 'select', ['paid', 'pending', 'partial', 'refunded', 'void']],
        ['proof_storage_path', 'Proof storage path'],
        ['notes', 'Notes', 'textarea'],
      ]}
      columns={[
        ['customer', 'Customer', (row) => data.customers.find((item) => item.id === row.customer_id)?.display_name || '-'],
        ['amount', 'Amount', (row) => formatMoney(row.amount)],
        ['payment_date', 'Date'],
        ['payment_method', 'Method'],
        ['payment_status', 'Status', (row) => <StatusBadge value={row.payment_status}>{row.payment_status}</StatusBadge>],
        ['proof_storage_path', 'Proof', (row) => <StoragePreview bucket="payment-proofs" path={row.proof_storage_path} />],
      ]}
    />
  );
}

function ExpensesPage({ data, reload, toast }) {
  return (
    <RecordManager
      title="Expenses"
      table="expenses"
      rows={data.expenses}
      canEdit
      addLabel="Add Expense"
      reload={reload}
      toast={toast}
      uploadBucket="expense-receipts"
      fields={[
        ['expense_date', 'Expense date', 'date'],
        ['category', 'Category', 'select', expenseCategories],
        ['amount', 'Amount', 'number'],
        ['payment_method', 'Payment method'],
        ['vendor', 'Vendor'],
        ['linked_payroll_period_id', 'Payroll period', 'select', [['', 'None'], ...data.payroll_periods.map((item) => [item.id, `${formatDate(item.period_month).slice(0, 7)} ${item.total_amount}`])]],
        ['receipt_storage_path', 'Receipt path'],
        ['notes', 'Notes', 'textarea'],
      ]}
      columns={[
        ['expense_date', 'Date'],
        ['category', 'Category'],
        ['amount', 'Amount', (row) => formatMoney(row.amount)],
        ['vendor', 'Vendor'],
        ['receipt_storage_path', 'Receipt', (row) => <StoragePreview bucket="expense-receipts" path={row.receipt_storage_path} />],
      ]}
    />
  );
}

function ImportPage({ data, reload, toast }) {
  const [type, setType] = useState('customer_summary');
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const load = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const rows = parseCsv(await file.text());
    setPreview(rows.map((row, index) => mapImportRow(row, index, type, data)));
  };
  const commit = async () => {
    const { data: batch, error } = await supabase.from('import_batches').insert({ import_type: type, file_name: fileName, row_count: preview.length, success_count: 0, error_count: 0 }).select('*').single();
    if (error) {
      toast(error.message);
      return;
    }
    let success = 0;
    let fail = 0;
    for (const item of preview) {
      const ok = type === 'customer_summary' ? await importSummary(item) : await importLesson(item, data);
      if (ok) success += 1;
      else fail += 1;
    }
    await supabase.from('import_batches').update({ success_count: success, error_count: fail }).eq('id', batch.id);
    toast(`Imported ${success} rows, ${fail} errors`);
    await reload();
  };
  return (
    <div className="grid gap-5">
      <Section title="CSV Import">
        <div className="grid gap-3 md:grid-cols-[240px_1fr_auto]">
          <Select value={type} onChange={(event) => setType(event.target.value)}><option value="customer_summary">Customer/package summary</option><option value="lesson_records">Lesson records</option></Select>
          <Input type="file" accept=".csv" onChange={load} />
          <Button disabled={!preview.length} onClick={commit}>Import preview rows</Button>
        </div>
        <p className="mt-3 text-sm text-slate-500">Phone numbers are treated as text. Missing names become placeholders such as Customer 1668, Student 1668, and Group 1668.</p>
      </Section>
      <Section title="Preview">
        <DataTable rows={preview.map((row, index) => ({ id: index, ...row }))} columns={Object.keys(preview[0] || { status: '' }).map((key) => ({ key, label: key }))} />
      </Section>
    </div>
  );
}

function mapImportRow(row, index, type, data) {
  const phone = String(getMapped(row, ['电话号码', '電話號碼', 'phone_number', 'phone', 'Phone'])).trim();
  const coachCode = getMapped(row, ['教练', '教練', 'coach_code', 'coach']);
  const coach = data.coaches.find((item) => item.coach_code === coachCode || item.display_name === coachCode);
  if (type === 'lesson_records') {
    return {
      source_row: index + 1,
      phone,
      coach_code: coachCode,
      coach_id: coach?.id || '',
      lesson_date: getMapped(row, ['上课日期', '上課日期', 'lesson_date']),
      wage: getMapped(row, ['工资', '工資', 'wage']),
      note: getMapped(row, ['备注', '備註', 'note']),
      payroll_status: getMapped(row, ['结账', '結賬', 'payroll_status']),
      payroll_paid_date: getMapped(row, ['结账日期', '結賬日期', 'payroll_paid_date']),
    };
  }
  return {
    source_row: index + 1,
    phone,
    customer_name: placeholder('Customer', phone),
    student_name: placeholder('Student', phone),
    group_name: placeholder('Group', phone),
    class_type: getMapped(row, ['课程', '課程', 'class_type']) || '1-1',
    coach_code: coachCode,
    coach_id: coach?.id || '',
    package_total: getMapped(row, ['配套', 'package_total']) || 4,
    status: getMapped(row, ['状态', '狀態', 'status']) || 'active',
    start_date: getMapped(row, ['开始日期', '開始日期', 'start_date']) || todayISO(),
    last_lesson_date: getMapped(row, ['最后上课日期', '最後上課日期', 'last_lesson_date']),
    price: getMapped(row, ['价钱', '價錢', 'price']),
    coach_wage: getMapped(row, ['教练工资', '教練工資', 'coach_wage']),
    referral_fee: getMapped(row, ['介绍费', '介紹費', 'referral_fee']),
    total: getMapped(row, ['总', '總', 'total']),
    used_lessons: getMapped(row, ['已上堂', 'used_lessons']) || 0,
    remaining_lessons: getMapped(row, ['剩余堂', '剩餘堂', 'remaining_lessons']) || 0,
    reminder: getMapped(row, ['要求提醒', 'reminder']),
  };
}
async function importSummary(item) {
  const { data: customer, error: customerError } = await supabase.from('customers').insert({ display_name: item.customer_name, parent_name: item.customer_name, whatsapp: item.phone, status: item.status, source: 'legacy_google_sheet' }).select('*').single();
  if (customerError) return false;
  const { data: student } = await supabase.from('students').insert({ customer_id: customer.id, display_name: item.student_name, status: 'active' }).select('*').single();
  const { data: cls } = await supabase.from('classes').insert({ customer_id: customer.id, class_name: item.group_name, class_type: item.class_type, scheduling_mode: 'flexible', assigned_coach_id: item.coach_id || null, status: 'active' }).select('*').single();
  if (student && cls) await supabase.from('class_students').insert({ class_id: cls.id, student_id: student.id, active: true });
  const total = Number(item.package_total || 0);
  const packageType = total === 1 ? 'single' : `${total}_lessons`;
  const { data: pkg } = await supabase.from('packages').insert({ customer_id: customer.id, class_id: cls?.id, package_type: packageTypes.includes(packageType) ? packageType : 'special', total_lessons: total, used_lessons: Number(item.used_lessons || 0), remaining_lessons: Number(item.remaining_lessons || 0), start_date: item.start_date, payment_date: item.start_date, status: item.status, imported_from_legacy: true, notes: item.reminder }).select('*').single();
  if (pkg && Number(item.price || 0) > 0) await supabase.from('package_financials').insert({ package_id: pkg.id, customer_id: customer.id, amount: Number(item.price || 0), payment_date: item.start_date, payment_status: 'paid', payment_method: 'other', notes: `Legacy import. Coach wage ${item.coach_wage || '-'}, referral ${item.referral_fee || '-'}` });
  return true;
}

async function importLesson(item, data) {
  const customer = data.customers.find((row) => row.whatsapp === item.phone);
  const cls = data.classes.find((row) => row.customer_id === customer?.id);
  if (!customer || !cls) return false;
  const { error } = await supabase.from('lessons').insert({ lesson_code: `LEG-${Date.now().toString().slice(-6)}`, class_id: cls.id, coach_id: item.coach_id || cls.assigned_coach_id, scheduling_mode: 'flexible', scheduled_date: item.lesson_date, status: 'approved', count_package_lesson: false, coach_payable: false, coach_notes: item.note, admin_notes: 'Legacy imported lesson. Package summary already contains used/remaining counts.' });
  return !error;
}

function CleanupPage({ data }) {
  const rows = cleanupRows(data);
  return (
    <Section title="Missing Data Cleanup">
      <DataTable rows={rows} columns={[
        { key: 'type', label: 'Type' },
        { key: 'name', label: 'Record' },
        { key: 'issue', label: 'Issue' },
        { key: 'action', label: 'Open', render: (row) => <Button variant="ghost" onClick={() => go(row.href)}>Open</Button> },
      ]} />
    </Section>
  );
}

async function exportAllDataBackup(data, profile, toast) {
  if (!window.confirm('Export all Admin-accessible OS data as JSON? This includes private operational and finance records, but not storage file binaries. Keep the file secure.')) return;
  const exportTables = [
    'profiles',
    'coaches',
    'coach_rates',
    'customers',
    'students',
    'venues',
    'classes',
    'class_students',
    'packages',
    'package_financials',
    'recurring_schedules',
    'lessons',
    'lesson_participants',
    'lesson_photos',
    'lesson_change_logs',
    'payroll_periods',
    'payroll_items',
    'expenses',
    'consents',
    'student_skill_profiles',
    'student_skill_progress',
    'lesson_skill_assessments',
    'audit_logs',
  ];
  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: { id: profile.id, email: profile.email, role: profile.role },
    note: 'Storage files are not included. Storage paths are included where stored in database rows.',
    tables: Object.fromEntries(exportTables.map((name) => [name, data[name] || []])),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ty-swim-academy-os-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: profile.id,
    action: 'export_all_data',
    entity_type: 'backup',
    new_data: { exported_at: payload.exported_at, tables: exportTables, row_counts: Object.fromEntries(exportTables.map((name) => [name, (data[name] || []).length])) },
  });
  if (error) toast(`Backup downloaded. Audit log note: ${error.message}`);
  else toast('Backup downloaded and audit log saved.');
}

function ReportsPage({ profile, data, toast }) {
  const month = todayISO().slice(0, 7);
  const lessonCount = data.lessons.filter((row) => String(row.scheduled_date).startsWith(month)).length;
  const payments = sumThisMonth(data.package_financials, 'payment_date', 'amount');
  const expenses = sumThisMonth(data.expenses, 'expense_date', 'amount');
  const salary = data.payroll_items.filter((row) => row.status !== 'void').reduce((sum, row) => sum + Number(row.pay_amount || 0), 0);
  const renewal = data.packages.filter((pkg) => Number(pkg.remaining_lessons) <= 1 || (daysUntil(pkg.expiry_date) >= 0 && daysUntil(pkg.expiry_date) <= 7));
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Card title="Monthly lessons" value={lessonCount} />
        <Card title="Monthly payments" value={formatMoney(payments)} tone="green" />
        <Card title="Monthly expenses" value={formatMoney(expenses)} tone="rose" />
        <Card title="Coach salary payable" value={formatMoney(salary)} tone="amber" />
      </div>
      <Section title="Package Renewal Reminders" action={<Button variant="ghost" onClick={() => downloadCsv(`ty-renewals-${month}.csv`, renewal)}>Export CSV</Button>}>
        <DataTable rows={renewal} columns={[
          { key: 'package_code', label: 'Package' },
          { key: 'customer', label: 'Customer', render: (row) => data.customers.find((item) => item.id === row.customer_id)?.display_name || '-' },
          { key: 'remaining_lessons', label: 'Remaining' },
          { key: 'expiry_date', label: 'Expiry' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge> },
        ]} />
      </Section>
      <Section title="Admin Backup">
        <p className="mb-4 text-sm leading-6 text-slate-500">Download a JSON backup of Admin-accessible database records. Storage files are not included; only storage paths are included.</p>
        <Button onClick={() => exportAllDataBackup(data, profile, toast)}>Export All Data JSON</Button>
      </Section>
    </div>
  );
}

function AuditLogPage({ data }) {
  const [filters, setFilters] = useState({ from: '', to: '', actor: '', entity: '', action: '' });
  const rows = (data.audit_logs || [])
    .filter((row) => !filters.from || String(row.created_at || '').slice(0, 10) >= filters.from)
    .filter((row) => !filters.to || String(row.created_at || '').slice(0, 10) <= filters.to)
    .filter((row) => !filters.actor || row.actor_id === filters.actor)
    .filter((row) => !filters.entity || row.entity_type === filters.entity)
    .filter((row) => !filters.action || row.action === filters.action)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const actors = [...new Set((data.audit_logs || []).map((row) => row.actor_id).filter(Boolean))];
  const entities = [...new Set((data.audit_logs || []).map((row) => row.entity_type).filter(Boolean))].sort();
  const actions = [...new Set((data.audit_logs || []).map((row) => row.action).filter(Boolean))].sort();
  return (
    <div className="grid gap-5">
      <Section title="Audit Logs">
        <p className="text-sm leading-6 text-slate-500 ty-wrap">Read-only history of important system actions. Use this when checking who changed a lesson, package, payroll, payment, expense, backup, or reversal.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Field label="From"><Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></Field>
          <Field label="To"><Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></Field>
          <Field label="Actor"><Select value={filters.actor} onChange={(event) => setFilters({ ...filters, actor: event.target.value })}><option value="">All actors</option>{actors.map((id) => <option key={id} value={id}>{actorName(id, data)}</option>)}</Select></Field>
          <Field label="Entity"><Select value={filters.entity} onChange={(event) => setFilters({ ...filters, entity: event.target.value })}><option value="">All entities</option>{entities.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="Action"><Select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}><option value="">All actions</option>{actions.map((item) => <option key={item}>{item}</option>)}</Select></Field>
        </div>
      </Section>
      <Section title="Recent Activity">
        {rows.length === 0 ? <EmptyState title="No audit logs found" body="Actions will appear here after Admin updates important records." /> : (
          <>
            <div className="grid gap-3 md:hidden">
              {rows.map((row) => <AuditLogCard key={row.id} row={row} data={data} />)}
            </div>
            <DataTable className="hidden md:block" rows={rows} columns={[
              { key: 'created_at', label: 'When', render: (row) => `${formatDate(row.created_at)} ${String(row.created_at || '').slice(11, 16)}` },
              { key: 'actor', label: 'Actor', render: (row) => actorName(row.actor_id, data) },
              { key: 'action', label: 'Action' },
              { key: 'entity_type', label: 'Entity' },
              { key: 'entity', label: 'ID / Code', render: (row) => entityLabel(row, data) },
              { key: 'summary', label: 'Summary', render: (row) => auditSummary(row) },
            ]} />
          </>
        )}
      </Section>
    </div>
  );
}

function AuditLogCard({ row, data }) {
  return (
    <article className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sky-700">{formatDate(row.created_at)} {String(row.created_at || '').slice(11, 16)}</p>
          <h3 className="mt-1 font-semibold text-slate-950 ty-wrap">{row.action}</h3>
        </div>
        <StatusBadge value={row.entity_type}>{row.entity_type}</StatusBadge>
      </div>
      <p className="mt-3 text-sm text-slate-600 ty-wrap"><span className="font-semibold">Actor:</span> {actorName(row.actor_id, data)}</p>
      <p className="mt-1 text-sm text-slate-600 ty-wrap"><span className="font-semibold">Record:</span> {entityLabel(row, data)}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500 ty-wrap">{auditSummary(row)}</p>
    </article>
  );
}

function actorName(actorId, data) {
  const profile = data.profiles.find((item) => item.id === actorId);
  return profile?.full_name || profile?.email || actorId || 'System';
}

function entityLabel(row, data) {
  const table = data[row.entity_type] || [];
  const item = table.find((candidate) => candidate.id === row.entity_id);
  return item?.lesson_code || item?.package_code || item?.customer_code || item?.student_code || item?.class_code || item?.coach_code || item?.display_name || row.entity_id || '-';
}

function auditSummary(row) {
  if (row.action === 'export_all_data') return 'Admin exported a JSON backup.';
  if (row.action === 'reverse_approval') return row.new_data?.reason ? `Approval reversed: ${row.new_data.reason}` : 'Approval reversed.';
  const oldData = row.old_data || {};
  const newData = row.new_data || {};
  const changed = Object.keys(newData).filter((key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]) && !['updated_at'].includes(key)).slice(0, 5);
  if (row.action === 'insert') return `Created ${row.entity_type}.`;
  if (changed.length) return `Changed ${changed.join(', ')}.`;
  return 'System record saved.';
}

function SettingsPage({ data, reload, toast }) {
  return (
    <div className="grid gap-5">
      <RecordManager
        title="Users / Profiles"
        table="profiles"
        rows={data.profiles}
        canEdit
        addLabel="Add User"
        reload={reload}
        toast={toast}
        fields={[
          ['full_name', 'Full name'],
          ['email', 'Email'],
          ['role', 'Role', 'select', ['admin', 'coach']],
          ['active', 'Active', 'checkbox'],
        ]}
        columns={[
          ['full_name', 'Name'],
          ['email', 'Email'],
          ['role', 'Role'],
          ['active', 'Active', (row) => row.active ? 'Yes' : 'No'],
        ]}
      />
      <RecordManager
        title="Coaches"
        table="coaches"
        rows={data.coaches}
        canEdit
        addLabel="Add Coach"
        reload={reload}
        toast={toast}
        fields={[
          ['profile_id', 'Profile', 'select', [['', 'No login profile'], ...data.profiles.map((item) => [item.id, item.full_name || item.email])]],
          ['coach_code', 'Coach code'],
          ['display_name', 'Display name'],
          ['phone', 'Phone'],
          ['gender', 'Gender'],
          ['areas_covered', 'Areas covered', 'textarea'],
          ['status', 'Status', 'select', ['active', 'paused', 'inactive']],
          ['notes', 'Notes', 'textarea'],
        ]}
        columns={[
          ['coach_code', 'Code'],
          ['display_name', 'Name'],
          ['phone', 'Phone'],
          ['status', 'Status', (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge>],
        ]}
      />
      <RecordManager
        title="Coach Rates"
        table="coach_rates"
        rows={data.coach_rates || []}
        canEdit
        addLabel="Add Rate"
        reload={reload}
        toast={toast}
        fields={[
          ['coach_id', 'Coach', 'select', data.coaches.map((item) => [item.id, item.display_name])],
          ['class_type', 'Class type', 'select', classTypes],
          ['default_rate', 'Default rate', 'number'],
          ['effective_from', 'Effective from', 'date'],
          ['active', 'Active', 'checkbox'],
          ['notes', 'Notes', 'textarea'],
        ]}
        columns={[
          ['coach', 'Coach', (row) => data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-'],
          ['class_type', 'Class type'],
          ['default_rate', 'Rate', (row) => formatMoney(row.default_rate)],
          ['effective_from', 'Effective'],
          ['active', 'Active', (row) => row.active ? 'Yes' : 'No'],
        ]}
      />
    </div>
  );
}

function RecordManager({ title, table, rows, fields, columns, canEdit, addLabel = 'Add New', reload, toast, onRowClick, normalize, extraAction, uploadBucket }) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const visible = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const tableColumns = columns.map(([key, label, render]) => ({ key, label, render }));
  if (canEdit) tableColumns.push({ key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-2"><Button variant="ghost" onClick={(event) => { event.stopPropagation(); setModal(row); }}>Edit</Button>{extraAction?.(row)}</div> });
  return (
    <Section title={title} action={<div className="flex flex-wrap gap-2"><Input placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />{canEdit ? <Button onClick={() => setModal({})}>{addLabel}</Button> : null}<Button variant="ghost" onClick={() => downloadCsv(`ty-${table}-${todayISO()}.csv`, visible)}>Export CSV</Button></div>}>
      <DataTable rows={visible} columns={tableColumns} onRowClick={onRowClick} />
      {modal ? (
        <Modal title={`${modal.id ? 'Edit' : 'New'} ${title}`} onClose={() => setModal(null)} wide>
          <RecordForm
            table={table}
            initial={modal}
            fields={fields}
            normalize={normalize}
            uploadBucket={uploadBucket}
            onSaved={async () => {
              setModal(null);
              await reload();
              toast('Saved');
            }}
          />
        </Modal>
      ) : null}
    </Section>
  );
}

function RecordForm({ table, initial, fields, onSaved, normalize, uploadBucket }) {
  const [form, setForm] = useState(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const storageField = fields.find(([key]) => key.includes('storage_path'))?.[0] || fields.find(([key]) => key.includes('proof') || key.includes('receipt'))?.[0];
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = normalize ? normalize(form) : form;
    const { error } = payload.id
      ? await supabase.from(table).update(payload).eq('id', payload.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) window.alert(error.message);
    else onSaved();
  };
  const upload = async (field, file) => {
    if (!uploadBucket || !file) return;
    const path = `${table}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(uploadBucket).upload(path, file, { upsert: false });
    if (error) window.alert(error.message);
    else set(field, path);
  };
  const removeUpload = async () => {
    if (!uploadBucket || !storageField || !form[storageField]) return;
    if (!window.confirm('Delete this private file? Save the record after deleting to clear the file path.')) return;
    const { error } = await supabase.storage.from(uploadBucket).remove([form[storageField]]);
    if (error) window.alert(error.message);
    else set(storageField, '');
  };
  return (
    <form className="grid gap-4" onSubmit={save}>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.filter((field) => field[4] !== true).map(([key, label, type = 'text', options]) => (
          <RecordField key={key} fieldKey={key} label={label} type={type} options={options} value={form[key]} set={set} />
        ))}
      </div>
      {uploadBucket ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 p-3">
          <Field label="Upload private file">
            <Input type="file" onChange={(event) => upload(storageField, event.target.files?.[0])} />
          </Field>
          {storageField && form[storageField] ? (
            <div className="rounded-lg bg-slate-50 p-3">
              <StoragePreview bucket={uploadBucket} path={form[storageField]} />
              <div className="mt-3"><Button type="button" variant="danger" onClick={removeUpload}>Delete file</Button></div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex justify-end gap-2"><Button disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></div>
    </form>
  );
}

function RecordField({ fieldKey, label, type, options, value, set }) {
  if (type === 'hidden') return null;
  if (type === 'textarea') return <Field label={label}><Textarea value={value || ''} onChange={(event) => set(fieldKey, event.target.value)} /></Field>;
  if (type === 'select') {
    const items = options || [];
    return (
      <Field label={label}>
        <Select value={value || ''} onChange={(event) => set(fieldKey, event.target.value || null)}>
          {items.map((item) => Array.isArray(item) ? <option key={item[0]} value={item[0]}>{item[1]}</option> : <option key={item} value={item}>{item}</option>)}
        </Select>
      </Field>
    );
  }
  if (type === 'checkbox') return <label className="mt-7 flex items-center gap-2 text-sm font-medium text-slate-600"><input type="checkbox" checked={Boolean(value)} onChange={(event) => set(fieldKey, event.target.checked)} /> {label}</label>;
  return <Field label={label}><Input type={type} value={value || ''} onChange={(event) => set(fieldKey, type === 'number' ? Number(event.target.value) : event.target.value)} /></Field>;
}

function StoragePreview({ bucket, path, image = false }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setUrl('');
      setError('');
      if (!bucket || !path) return;
      const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (cancelled) return;
      if (signedError) setError(signedError.message);
      else setUrl(data?.signedUrl || '');
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [bucket, path]);
  if (!path) return <span className="text-slate-400">No file</span>;
  return (
    <div className="grid gap-2">
      {image && url ? <img className="h-32 w-full rounded-lg object-cover ring-1 ring-slate-200" src={url} alt="Private lesson upload preview" /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {url ? <a className="font-semibold text-sky-700 hover:text-sky-900" href={url} target="_blank" rel="noreferrer">Open signed preview</a> : <span className="text-xs text-slate-500">Creating signed preview...</span>}
        {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
      </div>
      <span className="break-all text-xs text-slate-500">{path}</span>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="min-w-0 rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 ty-wrap">{label}</p><div className="mt-1 text-sm font-medium text-slate-800 ty-wrap">{value || '-'}</div></div>;
}

function classStudentNames(classId, data) {
  const ids = data.class_students.filter((item) => item.class_id === classId && item.active !== false).map((item) => item.student_id);
  return ids.map((id) => data.students.find((student) => student.id === id)?.display_name).filter(Boolean).join(', ') || '-';
}

function coachNamesForCustomer(customerId, data) {
  const coachIds = new Set(data.classes.filter((cls) => cls.customer_id === customerId).map((cls) => cls.assigned_coach_id));
  return [...coachIds].map((id) => data.coaches.find((coach) => coach.id === id)?.display_name).filter(Boolean).join(', ') || '-';
}

function studentAlerts(cls, data) {
  if (!cls) return '';
  const ids = data.class_students.filter((item) => item.class_id === cls.id && item.active !== false).map((item) => item.student_id);
  return ids.map((id) => {
    const student = data.students.find((item) => item.id === id);
    return [student?.safety_alert, student?.health_notes, student?.special_needs].filter(Boolean).join(' / ');
  }).filter(Boolean).join(' | ');
}

function daysUntil(dateText) {
  if (!dateText) return 9999;
  const target = new Date(`${String(dateText).slice(0, 10)}T00:00:00`).getTime();
  const today = new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.ceil((target - today) / 86400000);
}

function sumThisMonth(rows, dateKey, amountKey) {
  const month = todayISO().slice(0, 7);
  return rows.filter((row) => String(row[dateKey] || '').startsWith(month)).reduce((sum, row) => sum + Number(row[amountKey] || 0), 0);
}

function cleanupRows(data) {
  const rows = [];
  data.customers.forEach((customer) => {
    if (!customer.display_name || /^Customer \d{4}$/.test(customer.display_name)) rows.push({ id: `customer-name-${customer.id}`, type: 'Customer', name: customer.display_name || customer.customer_code, issue: 'Missing customer name', href: `/customers/${customer.id}` });
    if (!customer.whatsapp) rows.push({ id: `customer-whatsapp-${customer.id}`, type: 'Customer', name: customer.display_name || customer.customer_code, issue: 'Missing WhatsApp', href: `/customers/${customer.id}` });
    if (!data.venues.some((venue) => venue.customer_id === customer.id && venue.full_address)) rows.push({ id: `address-${customer.id}`, type: 'Venue', name: customer.display_name || customer.customer_code, issue: 'Missing address/venue', href: `/customers/${customer.id}` });
    if (data.venues.some((venue) => venue.customer_id === customer.id && venue.full_address && !venue.google_maps_link)) rows.push({ id: `map-${customer.id}`, type: 'Venue', name: customer.display_name || customer.customer_code, issue: 'Missing Google Maps link', href: `/customers/${customer.id}` });
    if (!data.consents.some((consent) => consent.customer_id === customer.id)) rows.push({ id: `consent-${customer.id}`, type: 'Consent', name: customer.display_name || customer.customer_code, issue: 'Missing consent info', href: `/customers/${customer.id}` });
  });
  data.students.forEach((student) => {
    if (!student.display_name || /^Student \d{4}$/.test(student.display_name)) rows.push({ id: `student-name-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing student name', href: `/students/${student.id}` });
    if (!student.age) rows.push({ id: `age-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing age', href: `/students/${student.id}` });
    if (!student.health_notes && !student.safety_alert) rows.push({ id: `health-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing health confirmation', href: `/students/${student.id}` });
    if (!student.photo_consent_status || student.photo_consent_status === 'unknown') rows.push({ id: `photo-consent-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing photo consent', href: `/students/${student.id}` });
    if (!data.student_skill_profiles.some((profile) => profile.student_id === student.id) && !student.level) rows.push({ id: `level-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing current level', href: `/students/${student.id}` });
  });
  data.packages.forEach((pkg) => {
    if (daysUntil(pkg.expiry_date) < 0 && Number(pkg.remaining_lessons) > 0) rows.push({ id: `expired-${pkg.id}`, type: 'Package', name: pkg.package_code, issue: 'Expired package with remaining lessons', href: '/packages' });
  });
  data.classes.forEach((cls) => {
    if (!cls.assigned_coach_id) rows.push({ id: `coach-${cls.id}`, type: 'Class', name: cls.class_name, issue: 'Missing assigned coach', href: '/classes' });
  });
  data.package_financials.forEach((payment) => {
    if (payment.payment_status === 'paid' && !payment.proof_storage_path) rows.push({ id: `proof-${payment.id}`, type: 'Payment', name: payment.id, issue: 'Missing payment proof', href: '/payments' });
  });
  return rows;
}
