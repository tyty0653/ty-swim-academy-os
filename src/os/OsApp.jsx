import { useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';
import { Button, Card, DataTable, EmptySetup, Field, Input, Modal, Section, Select, StatusBadge, Textarea, Toasts } from './OsComponents.jsx';
import { classTypes, coachHiddenNav, expenseCategories, osNav, packageTypes, paymentMethods } from './osConstants.js';
import { derivePackageExpiry, downloadCsv, formatDate, formatMoney, getMapped, parseCsv, placeholder, todayISO } from './osUtils.js';

const tableNames = [
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
  'import_batches',
  'audit_logs',
];

const initialData = Object.fromEntries(tableNames.map((name) => [name, []]));

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    go('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-16 text-slate-700">
      <div className="mx-auto max-w-md rounded-xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70">
        <p className="text-sm font-semibold text-sky-700">TY Swim Academy OS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Admin / Coach Login</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <Field label="Email"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Password"><Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          {message ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{message}</p> : null}
          <Button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
        </form>
        <button className="mt-5 inline-flex text-sm font-semibold text-sky-700" type="button" onClick={() => go('/dashboard')}>Back to dashboard</button>
      </div>
    </div>
  );
}

function ProtectedOs({ pathInfo }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const toast = (message) => {
    const id = makeId('toast');
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 2600);
  };

  async function reload() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) {
      setLoading(false);
      go('/login');
      return;
    }
    setSession(auth.session);
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.session.user.id)
      .maybeSingle();
    if (profileError) toast(profileError.message);
    setProfile(profileRow);
    const tableResults = await Promise.all(tableNames.map((name) => supabase.from(name).select('*').limit(1000)));
    const next = { ...initialData };
    tableResults.forEach((result, index) => {
      if (!result.error) next[tableNames[index]] = result.data || [];
    });
    setData(next);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) go('/login');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Loading TY Swim Academy OS...</div>;
  if (!session || !profile) return <LoginPage />;
  if (!profile.active) return <LockedProfile />;

  return (
    <OsShell profile={profile} pathInfo={pathInfo} data={data} reload={reload} toast={toast}>
      <Toasts toasts={toasts} />
    </OsShell>
  );
}

function LockedProfile() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Account inactive</h1>
        <p className="mt-2 text-sm leading-6">This OS account exists but is not active. Ask an Admin to activate it in Supabase.</p>
      </div>
    </div>
  );
}

function OsShell({ profile, pathInfo, data, reload, toast, children }) {
  const isAdmin = profile.role === 'admin';
  const nav = osNav.filter(([key]) => isAdmin || !coachHiddenNav.has(key));

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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{profile.role}</p>
              <h2 className="text-xl font-semibold text-slate-950">{pageTitle(pathInfo)}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm lg:hidden" value={nav.find(([, href]) => href === pathInfo.path)?.[1] || `/${pathInfo.section}`} onChange={(event) => go(event.target.value)}>
                {nav.map(([key, href, label]) => <option key={key} value={href}>{label}</option>)}
              </select>
              <Button variant="ghost" onClick={() => go('/dashboard')}>Dashboard</Button>
              <Button variant="ghost" onClick={signOut}>Sign out</Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-6">
          <RoutePage profile={profile} pathInfo={pathInfo} data={data} reload={reload} toast={toast} />
        </main>
      </div>
    </div>
  );
}

function activeNav(pathInfo, key) {
  return (key === 'dashboard' && pathInfo.path === '/dashboard') || pathInfo.section === key || (key === 'cleanup' && pathInfo.section === 'data-cleanup');
}

function pageTitle(pathInfo) {
  if (pathInfo.path === '/dashboard') return 'Dashboard';
  return {
    customers: 'Customers',
    students: 'Students',
    venues: 'Venues',
    classes: 'Classes',
    packages: 'Packages',
    lessons: 'Schedule / Lessons',
    review: 'Review Queue',
    payroll: 'Payroll',
    payments: 'Payments',
    expenses: 'Expenses',
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
  if (pathInfo.section === 'lessons' && pathInfo.id) return <LessonDetail {...props} />;
  if (pathInfo.section === 'customers') return <CustomersPage {...props} />;
  if (pathInfo.section === 'students') return <StudentsPage {...props} />;
  if (pathInfo.section === 'venues') return <VenuesPage {...props} />;
  if (pathInfo.section === 'classes') return <ClassesPage {...props} />;
  if (pathInfo.section === 'packages') return <PackagesPage {...props} />;
  if (pathInfo.section === 'lessons') return <LessonsPage {...props} />;
  if (pathInfo.section === 'payroll') return <PayrollPage {...props} />;
  if (!isAdmin) return <NoAccess />;
  if (pathInfo.section === 'review') return <ReviewPage {...props} />;
  if (pathInfo.section === 'payments') return <PaymentsPage {...props} />;
  if (pathInfo.section === 'expenses') return <ExpensesPage {...props} />;
  if (pathInfo.section === 'import') return <ImportPage {...props} />;
  if (pathInfo.section === 'data-cleanup') return <CleanupPage {...props} />;
  if (pathInfo.section === 'reports') return <ReportsPage {...props} />;
  if (pathInfo.section === 'settings') return <SettingsPage {...props} />;
  return <Dashboard {...props} />;
}

function NoAccess() {
  return <Section title="No access"><p className="text-sm text-slate-500">This page is Admin only.</p></Section>;
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
  const oneRemaining = data.packages.filter((pkg) => Number(pkg.remaining_lessons) === 1);
  const zeroRemaining = data.packages.filter((pkg) => Number(pkg.remaining_lessons) === 0);
  const expiring = data.packages.filter((pkg) => {
    const days = daysUntil(pkg.expiry_date);
    return days >= 0 && days <= 7;
  });
  const expiredWithLessons = data.packages.filter((pkg) => daysUntil(pkg.expiry_date) < 0 && Number(pkg.remaining_lessons) > 0);
  const replacement = data.lessons.filter((lesson) => lesson.need_replacement);
  const cleanup = cleanupRows(data).length;
  const monthlyPayments = sumThisMonth(data.package_financials, 'payment_date', 'amount');
  const monthlyExpenses = sumThisMonth(data.expenses, 'expense_date', 'amount');
  const salaryPayable = data.payroll_items.filter((item) => item.status !== 'paid' && item.status !== 'void').reduce((sum, item) => sum + Number(item.pay_amount || 0), 0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Today's lessons" value={lessonsToday.length} />
        <Card title="Pending review" value={pending.length} tone="amber" />
        <Card title="Reschedules to check" value={reschedules.length} tone="rose" />
        <Card title="Cleanup items" value={cleanup} tone="slate" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <LessonList title="Today / This Week" rows={weekLessons} data={data} />
        <AttentionList rows={[
          ['Packages with 1 lesson', oneRemaining.length, '/packages'],
          ['Packages with 0 lessons', zeroRemaining.length, '/packages'],
          ['Expiring within 7 days', expiring.length, '/packages'],
          ['Expired with remaining lessons', expiredWithLessons.length, '/packages'],
          ['Lessons needing replacement', replacement.length, '/lessons'],
        ]} />
      </div>
      <Section title="Light Finance Summary">
        <div className="grid gap-3 md:grid-cols-4">
          <Card title="Monthly collected" value={formatMoney(monthlyPayments)} tone="green" />
          <Card title="Monthly expenses" value={formatMoney(monthlyExpenses)} tone="rose" />
          <Card title="Coach salary payable" value={formatMoney(salaryPayable)} tone="amber" />
          <Card title="Estimated net" value={formatMoney(monthlyPayments - monthlyExpenses - salaryPayable)} tone="sky" />
        </div>
      </Section>
    </div>
  );
}

function CoachDashboard({ profile, data }) {
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const ownLessons = data.lessons.filter((lesson) => lesson.coach_id === coach?.id);
  const today = ownLessons.filter((lesson) => lesson.scheduled_date === todayISO());
  const pending = ownLessons.filter((lesson) => ['scheduled', 'rescheduled', 'needs_edit'].includes(lesson.status));
  const payroll = data.payroll_items.filter((item) => item.coach_id === coach?.id && item.status !== 'void');

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Today's lessons" value={today.length} />
        <Card title="This week" value={ownLessons.filter((lesson) => daysUntil(lesson.scheduled_date) >= 0 && daysUntil(lesson.scheduled_date) <= 7).length} />
        <Card title="Pending records" value={pending.length} tone="amber" />
        <Card title="Expected payroll" value={formatMoney(payroll.reduce((sum, item) => sum + Number(item.pay_amount || 0), 0))} tone="green" />
      </div>
      <LessonList title="My Upcoming Lessons" rows={ownLessons.filter((lesson) => lesson.scheduled_date >= todayISO()).slice(0, 10)} data={data} coachView />
      <Section title="Quick Access">
        <div className="grid gap-3 md:grid-cols-2">
          {ownLessons.slice(0, 6).map((lesson) => {
            const cls = data.classes.find((item) => item.id === lesson.class_id);
            const customer = data.customers.find((item) => item.id === cls?.customer_id);
            const venue = data.venues.find((item) => item.id === lesson.venue_id);
            return (
              <button key={lesson.id} className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-sky-200" onClick={() => go(`/lessons/${lesson.id}`)}>
                <p className="font-semibold text-slate-950">{cls?.class_name || lesson.lesson_code}</p>
                <p className="mt-1 text-sm text-slate-500">{customer?.whatsapp || 'No WhatsApp'} | {venue?.area || venue?.full_address || 'No address'}</p>
                <p className="mt-2 text-xs font-semibold text-rose-600">{studentAlerts(cls, data) || 'No health/safety alerts'}</p>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function AttentionList({ rows }) {
  return (
    <Section title="Admin Attention">
      <div className="grid gap-2">
        {rows.map(([label, value, href]) => (
          <button key={label} onClick={() => go(href)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-sky-200 hover:bg-sky-50">
            <span className="font-medium text-slate-700">{label}</span>
            <span className="text-lg font-semibold text-slate-950">{value}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function LessonList({ title, rows, data, coachView = false }) {
  return (
    <Section title={title}>
      <DataTable
        rows={rows}
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
          { key: 'age', label: 'Age' },
          { key: 'level', label: 'Level' },
          { key: 'alert', label: 'Health / Safety', render: (row) => row.safety_alert || row.health_notes || row.special_needs || '-' },
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
  const assignedClassIds = new Set(data.classes.filter((cls) => cls.assigned_coach_id === coach?.id).map((cls) => cls.id));
  const assignedStudentIds = new Set(data.class_students.filter((item) => assignedClassIds.has(item.class_id)).map((item) => item.student_id));
  const rows = isAdmin ? data.students : data.students.filter((student) => assignedStudentIds.has(student.id));
  return (
    <RecordManager
      title="Students"
      table="students"
      rows={rows}
      canEdit={isAdmin}
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
        ['preferred_language', 'Preferred language'],
        ['status', 'Status', 'select', ['active', 'paused', 'completed', 'inactive']],
      ]}
      columns={[
        ['student_code', 'Code'],
        ['display_name', 'Name'],
        ['customer', 'Customer', (row) => data.customers.find((item) => item.id === row.customer_id)?.display_name || '-'],
        ['age', 'Age'],
        ['level', 'Level'],
        ['health', 'Health / Safety', (row) => row.safety_alert || row.health_notes || row.special_needs || '-'],
        ['status', 'Status', (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge>],
      ]}
    />
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
  const [filters, setFilters] = useState({ dateFrom: todayISO().slice(0, 8) + '01', dateTo: '', coach: '', classId: '', status: '', mode: '', pending: false, replacement: false });
  const [recurring, setRecurring] = useState(null);
  const [flexible, setFlexible] = useState(null);
  const rows = (isAdmin ? data.lessons : data.lessons.filter((lesson) => lesson.coach_id === coach?.id)).filter((lesson) => {
    return (!filters.dateFrom || lesson.scheduled_date >= filters.dateFrom)
      && (!filters.dateTo || lesson.scheduled_date <= filters.dateTo)
      && (!filters.coach || lesson.coach_id === filters.coach)
      && (!filters.classId || lesson.class_id === filters.classId)
      && (!filters.status || lesson.status === filters.status)
      && (!filters.mode || lesson.scheduling_mode === filters.mode)
      && (!filters.pending || ['completed_pending_review', 'cancelled_pending_review'].includes(lesson.status))
      && (!filters.replacement || lesson.need_replacement);
  });

  return (
    <div className="grid gap-5">
      <Section title="Filters" action={<div className="flex gap-2">{isAdmin ? <Button variant="soft" onClick={() => setRecurring({})}>Recurring schedule</Button> : null}<Button onClick={() => setFlexible({})}>Flexible lesson</Button></div>}>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Field label="From"><Input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></Field>
          <Field label="To"><Input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></Field>
          <Field label="Coach"><Select value={filters.coach} onChange={(event) => setFilters({ ...filters, coach: event.target.value })}><option value="">All</option>{data.coaches.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</Select></Field>
          <Field label="Class"><Select value={filters.classId} onChange={(event) => setFilters({ ...filters, classId: event.target.value })}><option value="">All</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</Select></Field>
          <Field label="Status"><Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All</option>{['scheduled', 'rescheduled', 'completed_pending_review', 'cancelled_pending_review', 'needs_edit', 'approved', 'rejected', 'archived'].map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Mode"><Select value={filters.mode} onChange={(event) => setFilters({ ...filters, mode: event.target.value })}><option value="">All</option><option value="fixed_weekly">Fixed weekly</option><option value="flexible">Flexible</option></Select></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={filters.pending} onChange={(event) => setFilters({ ...filters, pending: event.target.checked })} /> Pending review</label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={filters.replacement} onChange={(event) => setFilters({ ...filters, replacement: event.target.checked })} /> Replacement</label>
        </div>
      </Section>
      <LessonList title="Lessons" rows={rows} data={data} coachView={!isAdmin} />
      {recurring ? <RecurringModal data={data} reload={reload} toast={toast} onClose={() => setRecurring(null)} /> : null}
      {flexible ? <FlexibleLessonModal profile={profile} data={data} reload={reload} toast={toast} onClose={() => setFlexible(null)} /> : null}
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
  const classOptions = profile.role === 'admin' ? data.classes : data.classes.filter((item) => item.assigned_coach_id === coach?.id && item.scheduling_mode === 'flexible');
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
  const coachLocked = !isAdmin && approved;

  const saveLesson = async () => {
    const updates = { ...form, updated_by: profile.id };
    const oldSchedule = { scheduled_date: lesson.scheduled_date, start_time: lesson.start_time, end_time: lesson.end_time };
    const newSchedule = { scheduled_date: updates.scheduled_date, start_time: updates.start_time, end_time: updates.end_time };
    if (JSON.stringify(oldSchedule) !== JSON.stringify(newSchedule)) {
      if (!rescheduleReason.trim()) {
        toast('Please add a reschedule reason');
        return;
      }
      updates.status = lesson.status === 'approved' ? 'approved' : 'rescheduled';
    }
    const { error } = await supabase.from('lessons').update(updates).eq('id', lesson.id);
    if (error) {
      toast(error.message);
      return;
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
  };

  const submitReview = async (status = 'completed_pending_review') => {
    await saveLesson();
    const { error } = await supabase.from('lessons').update({ status, coach_submitted_at: new Date().toISOString(), updated_by: profile.id }).eq('id', lesson.id);
    if (error) toast(error.message);
    else {
      toast('Lesson submitted for Admin review');
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
                <div><p className="font-semibold text-slate-950">{student?.display_name}</p><p className="text-xs text-rose-600">{student?.safety_alert || student?.health_notes || student?.special_needs || ''}</p></div>
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
        <LessonPhotos lesson={lesson} data={data} reload={reload} toast={toast} />
      </Section>
      <LessonApprovalPanel isAdmin={isAdmin} lesson={lesson} onSave={saveLesson} onSubmit={submitReview} onApprove={approve} onReviewUpdate={reviewUpdate} disabled={coachLocked} />
      {isAdmin ? <AuditPanels lesson={lesson} data={data} /> : null}
    </div>
  );
}

function LessonPhotos({ lesson, data, reload, toast }) {
  const [type, setType] = useState('attendance_proof');
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
    await supabase.from('lesson_photos').insert({ lesson_id: lesson.id, storage_path: path, photo_type: type });
    toast('Photo uploaded');
    await reload();
  };
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={type} onChange={(event) => setType(event.target.value)}>{['attendance_proof', 'progress_record', 'pool_issue', 'marketing_candidate', 'other'].map((item) => <option key={item}>{item}</option>)}</Select>
        <Input type="file" accept="image/*" onChange={upload} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">{photos.map((photo) => <div key={photo.id} className="rounded-lg bg-slate-50 p-3 text-sm">{photo.photo_type}<br /><span className="text-xs text-slate-500">{photo.storage_path}</span></div>)}</div>
    </div>
  );
}

function LessonApprovalPanel({ isAdmin, lesson, onSave, onSubmit, onApprove, onReviewUpdate, disabled }) {
  return (
    <Section title="Lesson Approval">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onSave} disabled={disabled}>Save changes</Button>
        {!isAdmin ? <Button onClick={() => onSubmit('completed_pending_review')} disabled={disabled}>Submit completed lesson</Button> : null}
        {!isAdmin ? <Button variant="soft" onClick={() => onSubmit('cancelled_pending_review')} disabled={disabled}>Submit cancellation</Button> : null}
        {isAdmin ? <Button onClick={onApprove} disabled={lesson.status === 'approved'}>Approve and apply package/payroll</Button> : null}
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
  const rows = data.lessons.filter((lesson) => ['completed_pending_review', 'cancelled_pending_review', 'needs_edit'].includes(lesson.status) || data.lesson_change_logs.some((log) => log.lesson_id === lesson.id && !log.admin_seen));
  const approve = async (lesson) => {
    const { error } = await supabase.rpc('approve_lesson', { p_lesson_id: lesson.id });
    if (error) toast(error.message);
    else {
      toast('Lesson approved');
      await reload();
    }
  };
  return (
    <Section title="Admin Review Queue">
      <DataTable rows={rows} onRowClick={(row) => go(`/lessons/${row.id}`)} columns={[
        { key: 'lesson_code', label: 'Lesson' },
        { key: 'date', label: 'Date', render: (row) => `${row.scheduled_date} ${row.start_time || ''}` },
        { key: 'class', label: 'Class', render: (row) => data.classes.find((cls) => cls.id === row.class_id)?.class_name || '-' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
        { key: 'photo', label: 'Photo', render: (row) => {
          const cls = data.classes.find((item) => item.id === row.class_id);
          const count = (data.lesson_photos || []).filter((photo) => photo.lesson_id === row.id).length;
          return cls?.photo_required && count === 0 ? <StatusBadge value="needs_edit">Missing required</StatusBadge> : count;
        } },
        { key: 'action', label: 'Action', render: (row) => <Button onClick={(event) => { event.stopPropagation(); approve(row); }}>Approve</Button> },
      ]} />
    </Section>
  );
}

function PayrollPage({ profile, data, reload, toast }) {
  const isAdmin = profile.role === 'admin';
  const coach = data.coaches.find((item) => item.profile_id === profile.id);
  const items = isAdmin ? data.payroll_items : data.payroll_items.filter((item) => item.coach_id === coach?.id);
  const periods = isAdmin ? data.payroll_periods : data.payroll_periods.filter((period) => period.coach_id === coach?.id);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
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
    <div className="grid gap-5">
      <Section title={isAdmin ? 'Generate Payroll' : 'My Expected Payroll'} action={isAdmin ? <div className="flex gap-2"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><Button onClick={generate}>Generate</Button><Button variant="ghost" onClick={() => downloadCsv(`ty-payroll-${month}.csv`, items)}>Export CSV</Button></div> : null}>
        <DataTable rows={periods} columns={[
          { key: 'coach', label: 'Coach', render: (row) => data.coaches.find((item) => item.id === row.coach_id)?.display_name || '-' },
          { key: 'period_month', label: 'Month', render: (row) => formatDate(row.period_month).slice(0, 7) },
          { key: 'total_lessons', label: 'Lessons' },
          { key: 'total_amount', label: 'Amount', render: (row) => formatMoney(row.total_amount) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{row.status}</StatusBadge> },
          { key: 'action', label: 'Action', render: (row) => isAdmin && row.status !== 'paid' ? <Button onClick={() => markPaid(row)}>Mark paid</Button> : '-' },
        ]} />
      </Section>
      <Section title="Payroll Items">
        <DataTable rows={items} columns={[
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

function PaymentsPage({ data, reload, toast }) {
  return (
    <RecordManager
      title="Payments"
      table="package_financials"
      rows={data.package_financials}
      canEdit
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
        ['proof_storage_path', 'Proof'],
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
        ['receipt_storage_path', 'Receipt'],
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
  const phone = String(getMapped(row, ['电话号码', 'phone_number', 'phone', 'Phone'])).trim();
  const coachCode = getMapped(row, ['教练', 'coach_code', 'coach']);
  const coach = data.coaches.find((item) => item.coach_code === coachCode || item.display_name === coachCode);
  if (type === 'lesson_records') {
    return {
      source_row: index + 1,
      phone,
      coach_code: coachCode,
      coach_id: coach?.id || '',
      lesson_date: getMapped(row, ['上课日期', 'lesson_date']),
      wage: getMapped(row, ['工资', 'wage']),
      note: getMapped(row, ['备注', 'note']),
      payroll_status: getMapped(row, ['结账', 'payroll_status']),
      payroll_paid_date: getMapped(row, ['结账日期', 'payroll_paid_date']),
    };
  }
  return {
    source_row: index + 1,
    phone,
    customer_name: placeholder('Customer', phone),
    student_name: placeholder('Student', phone),
    group_name: placeholder('Group', phone),
    class_type: getMapped(row, ['课程', 'class_type']) || '1-1',
    coach_code: coachCode,
    coach_id: coach?.id || '',
    package_total: getMapped(row, ['配套', 'package_total']) || 4,
    status: getMapped(row, ['状态', 'status']) || 'active',
    start_date: getMapped(row, ['开始日期', 'start_date']) || todayISO(),
    last_lesson_date: getMapped(row, ['最后上课日期', 'last_lesson_date']),
    price: getMapped(row, ['价钱', 'price']),
    coach_wage: getMapped(row, ['教练工资', 'coach_wage']),
    referral_fee: getMapped(row, ['介绍费', 'referral_fee']),
    total: getMapped(row, ['总', 'total']),
    used_lessons: getMapped(row, ['已上堂', 'used_lessons']) || 0,
    remaining_lessons: getMapped(row, ['剩余堂', 'remaining_lessons']) || 0,
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

function ReportsPage({ data }) {
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
    </div>
  );
}

function SettingsPage({ data, reload, toast }) {
  return (
    <div className="grid gap-5">
      <RecordManager
        title="Users / Profiles"
        table="profiles"
        rows={data.profiles}
        canEdit
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

function RecordManager({ title, table, rows, fields, columns, canEdit, reload, toast, onRowClick, normalize, extraAction, uploadBucket }) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const visible = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const tableColumns = columns.map(([key, label, render]) => ({ key, label, render }));
  if (canEdit) tableColumns.push({ key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-2"><Button variant="ghost" onClick={(event) => { event.stopPropagation(); setModal(row); }}>Edit</Button>{extraAction?.(row)}</div> });
  return (
    <Section title={title} action={<div className="flex flex-wrap gap-2"><Input placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />{canEdit ? <Button onClick={() => setModal({})}>New</Button> : null}<Button variant="ghost" onClick={() => downloadCsv(`ty-${table}-${todayISO()}.csv`, visible)}>Export CSV</Button></div>}>
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
  return (
    <form className="grid gap-4" onSubmit={save}>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.filter((field) => field[4] !== true).map(([key, label, type = 'text', options]) => (
          <RecordField key={key} fieldKey={key} label={label} type={type} options={options} value={form[key]} set={set} />
        ))}
      </div>
      {uploadBucket ? (
        <Field label="Upload private file">
          <Input type="file" onChange={(event) => upload(fields.find(([key]) => key.includes('storage_path'))?.[0] || fields.find(([key]) => key.includes('proof') || key.includes('receipt'))?.[0], event.target.files?.[0])} />
        </Field>
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

function Info({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 text-sm font-medium text-slate-800">{value || '-'}</div></div>;
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
    if (!data.venues.some((venue) => venue.customer_id === customer.id && venue.full_address)) rows.push({ id: `address-${customer.id}`, type: 'Venue', name: customer.display_name || customer.customer_code, issue: 'Missing address/venue', href: `/customers/${customer.id}` });
    if (!data.consents.some((consent) => consent.customer_id === customer.id)) rows.push({ id: `consent-${customer.id}`, type: 'Consent', name: customer.display_name || customer.customer_code, issue: 'Missing consent info', href: `/customers/${customer.id}` });
  });
  data.students.forEach((student) => {
    if (!student.display_name || /^Student \d{4}$/.test(student.display_name)) rows.push({ id: `student-name-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing student name', href: '/students' });
    if (!student.age) rows.push({ id: `age-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing age', href: '/students' });
    if (!student.health_notes && !student.safety_alert) rows.push({ id: `health-${student.id}`, type: 'Student', name: student.display_name, issue: 'Missing health confirmation', href: '/students' });
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
