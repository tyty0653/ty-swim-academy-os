import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

loadDotEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = process.env.QA_ADMIN_EMAIL;
const adminPassword = process.env.QA_ADMIN_PASSWORD;
const coachEmail = process.env.QA_COACH_EMAIL;
const coachPassword = process.env.QA_COACH_PASSWORD;
const runMutations = process.env.QA_RUN_MUTATIONS === 'true';
const results = [];

function result(status, check, detail = '') {
  results.push({ status, check, detail });
  console.log(`${status.padEnd(4)} ${check}${detail ? ` - ${detail}` : ''}`);
}

function pass(check, detail) {
  result('PASS', check, detail);
}

function warn(check, detail) {
  result('WARN', check, detail);
}

function info(check, detail) {
  result('INFO', check, detail);
}

function fail(check, detail) {
  result('FAIL', check, detail);
}

function client() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(label, email, password) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} login failed: ${error.message}`);
  return { supabase, user: data.user };
}

async function selectRows(supabase, table, columns = '*', options = {}) {
  let query = supabase.from(table).select(columns);
  if (options.eq) {
    for (const [key, value] of Object.entries(options.eq)) query = query.eq(key, value);
  }
  if (options.limit) query = query.limit(options.limit);
  return query;
}

async function countRows(supabase, table, options = {}) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (options.eq) {
    for (const [key, value] of Object.entries(options.eq)) query = query.eq(key, value);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function signedUrl(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error) throw error;
  return data?.signedUrl;
}

async function checkBucketReachable(supabase, bucket) {
  const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
  return { bucket, ok: !error, detail: error?.message || 'Reachable' };
}

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    warn('Live QA skipped', 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
    return;
  }
  if (!adminEmail || !adminPassword || !coachEmail || !coachPassword) {
    warn('Live QA skipped', 'Add QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD, QA_COACH_EMAIL, and QA_COACH_PASSWORD to .env.local or the shell.');
    return;
  }
  if (Object.keys(process.env).some((key) => key.startsWith('VITE_') && key.toLowerCase().includes('service_role'))) {
    fail('No frontend service_role env', 'A VITE_* service_role-looking variable is present. Remove it before testing or deploying.');
  } else {
    pass('No frontend service_role env', 'Only public Vite env keys should be exposed to the browser.');
  }

  const admin = await signIn('Admin', adminEmail, adminPassword);
  const { data: adminProfile, error: adminProfileError } = await admin.supabase.from('profiles').select('*').eq('id', admin.user.id).maybeSingle();
  if (adminProfileError) throw adminProfileError;
  if (adminProfile?.role === 'admin' && adminProfile.active) pass('Admin profile active', adminProfile.email);
  else fail('Admin profile active', `Expected active admin, got ${adminProfile?.role || 'missing'}.`);

  for (const table of ['profiles', 'coaches', 'customers', 'students', 'venues', 'classes', 'packages', 'lessons', 'package_financials', 'expenses', 'payroll_items', 'student_skill_profiles', 'student_skill_progress', 'lesson_skill_assessments', 'audit_logs']) {
    const { error } = await selectRows(admin.supabase, table, 'id', { limit: 1 });
    if (error) fail(`Admin can read ${table}`, error.message);
    else pass(`Admin can read ${table}`);
  }

  const bucketChecks = await Promise.all(['lesson-photos', 'payment-proofs', 'expense-receipts'].map((bucket) => checkBucketReachable(admin.supabase, bucket)));
  if (bucketChecks.every((item) => item.ok)) {
    pass('Required private buckets reachable to Admin', bucketChecks.map((item) => item.bucket).join(', '));
  } else {
    fail('Required private buckets reachable to Admin', bucketChecks.map((item) => `${item.bucket}: ${item.detail}`).join(' | '));
  }

  const { data: demoPackage, error: demoPackageError } = await admin.supabase.from('packages').select('*').eq('package_code', 'DEMO-PKG-0001').maybeSingle();
  const { data: demoLessons, error: demoLessonsError } = await admin.supabase.from('lessons').select('*').like('lesson_code', 'DEMO-LES-%').order('lesson_code');
  const demoPendingLesson = (demoLessons || []).find((lesson) => lesson.lesson_code === 'DEMO-LES-0003');
  const demoScheduledLesson = (demoLessons || []).find((lesson) => lesson.lesson_code === 'DEMO-LES-0001');
  const missingDemo = [
    demoPackage ? '' : 'DEMO-PKG-0001',
    demoScheduledLesson ? '' : 'DEMO-LES-0001',
    demoPendingLesson ? '' : 'DEMO-LES-0003',
  ].filter(Boolean);
  if (!demoPackageError && !demoLessonsError && missingDemo.length === 0) pass('Demo package and lessons exist', 'DEMO-PKG-0001, DEMO-LES-0001, DEMO-LES-0003');
  else warn('Demo package and lessons exist', `${demoPackageError?.message || demoLessonsError?.message || `Missing: ${missingDemo.join(', ')}`}. Rerun the latest supabase/demo-seed.sql after replacing Auth user IDs.`);
  if (demoPendingLesson?.status === 'completed_pending_review') pass('Pending review demo lesson exists', demoPendingLesson.lesson_code);
  else warn('Pending review demo lesson exists', `Expected DEMO-LES-0003 completed_pending_review, got ${demoPendingLesson?.status || 'missing'}. Visible demo lessons: ${(demoLessons || []).map((lesson) => `${lesson.lesson_code}:${lesson.status}`).join(', ') || 'none'}. Rerun the latest demo-seed.sql.`);

  const coach = await signIn('Coach', coachEmail, coachPassword);
  const { data: coachProfile, error: coachProfileError } = await coach.supabase.from('profiles').select('*').eq('id', coach.user.id).maybeSingle();
  if (coachProfileError) throw coachProfileError;
  if (coachProfile?.role === 'coach' && coachProfile.active) pass('Coach profile active', coachProfile.email);
  else fail('Coach profile active', `Expected active coach, got ${coachProfile?.role || 'missing'}.`);

  const { data: ownCoach } = await coach.supabase.from('coaches').select('*').eq('profile_id', coach.user.id).maybeSingle();
  if (ownCoach?.id) pass('Coach row linked to profile', ownCoach.coach_code);
  else fail('Coach row linked to profile', 'No coaches.profile_id row for this Coach Auth user.');

  for (const [table, label] of [['lessons', 'assigned lessons'], ['classes', 'assigned classes'], ['students', 'assigned students'], ['venues', 'assigned venues']]) {
    const { data, error } = await selectRows(coach.supabase, table, 'id', { limit: 20 });
    if (error) fail(`Coach can read ${label}`, error.message);
    else if ((data || []).length > 0) pass(`Coach can read ${label}`, `${data.length} visible`);
    else warn(`Coach can read ${label}`, 'No assigned demo rows visible. Check demo-seed profile IDs.');
  }

  for (const table of ['package_financials', 'expenses', 'audit_logs']) {
    const { data, error } = await selectRows(coach.supabase, table, 'id', { limit: 5 });
    if (error || (data || []).length === 0) pass(`Coach cannot see ${table}`, error ? error.message : '0 rows visible');
    else fail(`Coach cannot see ${table}`, `${data.length} row(s) visible to Coach.`);
  }

  const { data: coachPayroll, error: coachPayrollError } = await selectRows(coach.supabase, 'payroll_items', 'id, coach_id', { limit: 50 });
  if (coachPayrollError) fail('Coach payroll scope', coachPayrollError.message);
  else if ((coachPayroll || []).every((item) => !ownCoach?.id || item.coach_id === ownCoach.id)) pass('Coach payroll scope', `${coachPayroll.length} own item(s) visible`);
  else fail('Coach payroll scope', 'At least one payroll item belongs to a different coach.');

  if (!runMutations) {
    info('Mutation QA skipped', 'Set QA_RUN_MUTATIONS=true after running demo-seed.sql to test approve, payroll, expense, and storage flows.');
    return;
  }

  if (!demoPackage || !demoPendingLesson) {
    fail('Mutation QA prerequisites', 'Demo package or pending demo lesson missing.');
    return;
  }

  const { error: coachApproveError } = await coach.supabase.rpc('approve_lesson', { p_lesson_id: demoPendingLesson.id });
  if (coachApproveError) pass('Coach cannot approve lesson', coachApproveError.message);
  else fail('Coach cannot approve lesson', 'RPC succeeded for Coach. Check approve_lesson admin guard.');

  const packageBefore = Number(demoPackage.remaining_lessons);
  const usedBefore = Number(demoPackage.used_lessons);
  const payrollBefore = await countRows(admin.supabase, 'payroll_items', { eq: { lesson_id: demoPendingLesson.id } });
  const { error: approveError } = await admin.supabase.rpc('approve_lesson', { p_lesson_id: demoPendingLesson.id });
  if (approveError) fail('Admin approve demo lesson', approveError.message);
  else pass('Admin approve demo lesson');

  const { data: packageAfterFirst } = await admin.supabase.from('packages').select('*').eq('id', demoPackage.id).maybeSingle();
  const payrollAfterFirst = await countRows(admin.supabase, 'payroll_items', { eq: { lesson_id: demoPendingLesson.id } });
  if (Number(packageAfterFirst.remaining_lessons) === packageBefore - 1 && Number(packageAfterFirst.used_lessons) === usedBefore + 1) {
    pass('Package deducts once on first approval', `${packageBefore} -> ${packageAfterFirst.remaining_lessons}`);
  } else {
    fail('Package deducts once on first approval', `Before remaining ${packageBefore}, after ${packageAfterFirst?.remaining_lessons}`);
  }
  if (payrollAfterFirst === Math.max(payrollBefore, 1)) pass('Payroll item created once on approval', `${payrollAfterFirst} item(s)`);
  else fail('Payroll item created once on approval', `Before ${payrollBefore}, after ${payrollAfterFirst}`);

  await admin.supabase.rpc('approve_lesson', { p_lesson_id: demoPendingLesson.id });
  const { data: packageAfterSecond } = await admin.supabase.from('packages').select('*').eq('id', demoPackage.id).maybeSingle();
  const payrollAfterSecond = await countRows(admin.supabase, 'payroll_items', { eq: { lesson_id: demoPendingLesson.id } });
  if (Number(packageAfterSecond.remaining_lessons) === Number(packageAfterFirst.remaining_lessons)) pass('Second approval does not double deduct package');
  else fail('Second approval does not double deduct package', `${packageAfterFirst.remaining_lessons} -> ${packageAfterSecond.remaining_lessons}`);
  if (payrollAfterSecond === payrollAfterFirst) pass('Second approval does not duplicate payroll item');
  else fail('Second approval does not duplicate payroll item', `${payrollAfterFirst} -> ${payrollAfterSecond}`);

  const payrollMonth = `${demoPendingLesson.scheduled_date.slice(0, 7)}-01`;
  const { error: payrollError } = await admin.supabase.rpc('generate_monthly_payroll', { p_period_month: payrollMonth });
  if (payrollError) fail('Generate monthly payroll', payrollError.message);
  else pass('Generate monthly payroll', payrollMonth);
  const { data: period } = await admin.supabase.from('payroll_periods').select('*').eq('coach_id', demoPendingLesson.coach_id).eq('period_month', payrollMonth).maybeSingle();
  if (period?.id) pass('Payroll period exists', `${period.total_lessons} lesson(s), ${period.total_amount}`);
  else fail('Payroll period exists', 'No payroll period found after generation.');

  if (period?.id) {
    const expensesBefore = await countRows(admin.supabase, 'expenses', { eq: { linked_payroll_period_id: period.id } });
    const { error: paidError } = await admin.supabase.rpc('mark_payroll_paid', { p_period_id: period.id });
    if (paidError) fail('Mark payroll paid', paidError.message);
    else pass('Mark payroll paid');
    const expensesAfterFirst = await countRows(admin.supabase, 'expenses', { eq: { linked_payroll_period_id: period.id } });
    await admin.supabase.rpc('mark_payroll_paid', { p_period_id: period.id });
    const expensesAfterSecond = await countRows(admin.supabase, 'expenses', { eq: { linked_payroll_period_id: period.id } });
    if (expensesAfterFirst === Math.max(expensesBefore, 1)) pass('Payroll paid creates one expense', `${expensesAfterFirst} linked expense(s)`);
    else fail('Payroll paid creates one expense', `Before ${expensesBefore}, after ${expensesAfterFirst}`);
    if (expensesAfterSecond === expensesAfterFirst) pass('Repeating mark paid does not duplicate expense');
    else fail('Repeating mark paid does not duplicate expense', `${expensesAfterFirst} -> ${expensesAfterSecond}`);
  }

  const coachUploadLesson = demoScheduledLesson;
  if (coachUploadLesson?.id) {
    const path = `${coachUploadLesson.id}/qa-check-${Date.now()}.txt`;
    const blob = new Blob(['TY Swim OS QA'], { type: 'text/plain' });
    const { error: photoUploadError } = await coach.supabase.storage.from('lesson-photos').upload(path, blob, { upsert: false });
    if (photoUploadError) fail('Coach can upload assigned lesson photo', photoUploadError.message);
    else {
      pass('Coach can upload assigned lesson photo', path);
      const preview = await signedUrl(coach.supabase, 'lesson-photos', path);
      if (preview) pass('Coach can create signed preview for own lesson photo');
      const { data: insertedPhoto } = await coach.supabase.from('lesson_photos').insert({ lesson_id: coachUploadLesson.id, storage_path: path, photo_type: 'attendance_proof' }).select('*').maybeSingle();
      await admin.supabase.from('lesson_photos').delete().eq('id', insertedPhoto?.id || '00000000-0000-0000-0000-000000000000');
      await admin.supabase.storage.from('lesson-photos').remove([path]);
      pass('Admin can clean up lesson photo');
    }
  } else {
    warn('Coach can upload assigned lesson photo', 'No scheduled demo lesson found.');
  }

  for (const bucket of ['payment-proofs', 'expense-receipts']) {
    const deniedPath = `qa-denied-${Date.now()}.txt`;
    const { error } = await coach.supabase.storage.from(bucket).upload(deniedPath, new Blob(['denied'], { type: 'text/plain' }), { upsert: false });
    if (error) pass(`Coach cannot upload ${bucket}`, error.message);
    else {
      fail(`Coach cannot upload ${bucket}`, 'Upload succeeded. Removing file as Admin.');
      await admin.supabase.storage.from(bucket).remove([deniedPath]);
    }
    const adminPath = `qa-admin-${Date.now()}.txt`;
    const { error: adminUploadError } = await admin.supabase.storage.from(bucket).upload(adminPath, new Blob(['admin'], { type: 'text/plain' }), { upsert: false });
    if (adminUploadError) fail(`Admin can upload ${bucket}`, adminUploadError.message);
    else {
      const preview = await signedUrl(admin.supabase, bucket, adminPath);
      if (preview) pass(`Admin can create signed preview for ${bucket}`);
      await admin.supabase.storage.from(bucket).remove([adminPath]);
      pass(`Admin can delete ${bucket} object`);
    }
  }
}

try {
  await main();
} catch (error) {
  fail('Live QA crashed', error.message);
}

const hasFail = results.some((item) => item.status === 'FAIL');
const hasWarn = results.some((item) => item.status === 'WARN');
console.log('');
console.log(`Live QA summary: ${results.filter((item) => item.status === 'PASS').length} pass, ${results.filter((item) => item.status === 'WARN').length} warning, ${results.filter((item) => item.status === 'FAIL').length} fail, ${results.filter((item) => item.status === 'INFO').length} info.`);
if (hasFail) process.exit(1);
if (hasWarn) process.exit(0);
