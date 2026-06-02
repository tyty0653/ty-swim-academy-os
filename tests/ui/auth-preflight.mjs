import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const outputPath = path.resolve('test-artifacts', 'ui-auth-preflight.json');

export default async function globalSetup() {
  const envSources = loadLocalEnv();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const result = {
    createdAt: new Date().toISOString(),
    env: safeEnvSummary(envSources),
    admin: await checkRole('ADMIN', 'Admin', 'admin', envSources),
    coach: await checkRole('COACH', 'Coach', 'coach', envSources),
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Supabase QA host: ${result.env.supabaseHost || 'missing'}`);
  for (const [key, value] of Object.entries({ Admin: result.admin, Coach: result.coach })) {
    const state = value.ok ? 'PASS' : value.ready ? 'FAIL' : 'SKIP';
    const email = value.email ? ` for ${value.email}` : '';
    console.log(`${key} QA login preflight: ${state}${email}. ${value.message}`);
    console.log(`${key} diagnostics: password_present=${value.diagnostics.passwordPresent}, auth_success=${value.diagnostics.authSuccess}, session_user_id=${value.diagnostics.sessionUserId || 'none'}, profile_exists=${value.diagnostics.profileExists}, profile_role=${value.diagnostics.profileRole || 'none'}, profile_active=${String(value.diagnostics.profileActive)}`);
  }
}

async function checkRole(envRole, label, expectedRole, envSources) {
  const email = process.env[`QA_${envRole}_EMAIL`];
  const password = process.env[`QA_${envRole}_PASSWORD`];
  const diagnostics = {
    emailSource: envSources[`QA_${envRole}_EMAIL`] || 'not set',
    passwordSource: envSources[`QA_${envRole}_PASSWORD`] || 'not set',
    passwordPresent: Boolean(password),
    supabaseUrlSource: envSources.VITE_SUPABASE_URL || 'not set',
    supabaseAnonKeySource: envSources.VITE_SUPABASE_ANON_KEY || 'not set',
    supabaseHost: hostOnly(process.env.VITE_SUPABASE_URL),
    authSuccess: false,
    authError: '',
    sessionUserId: '',
    profileExists: false,
    profileError: '',
    profileRole: '',
    profileActive: null,
  };
  if (!email || !password) {
    return {
      reasonCode: 'missing-qa-credentials',
      ready: false,
      ok: false,
      email: email || '',
      diagnostics,
      message: `Missing QA_${envRole}_EMAIL or QA_${envRole}_PASSWORD. Add them to .env.local or your shell to run authenticated UI checks.`,
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      reasonCode: 'missing-supabase-env',
      ready: false,
      ok: false,
      email,
      diagnostics,
      message: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add test Supabase env values before authenticated UI checks.',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  diagnostics.authSuccess = Boolean(!authError && authData.session?.user?.id);
  diagnostics.authError = authError ? `${authError.name || 'AuthError'}: ${authError.message || 'Unknown auth error'}` : '';
  diagnostics.sessionUserId = authData.session?.user?.id || authData.user?.id || '';
  if (authError || !authData.user) {
    return {
      reasonCode: 'supabase-auth-failed',
      ready: true,
      ok: false,
      email,
      diagnostics,
      message: `${label} QA Supabase sign-in failed for ${email}. Check QA_${envRole}_EMAIL / QA_${envRole}_PASSWORD and confirm VITE_SUPABASE_URL points to the same test project as the app. Password was not printed. Auth error: ${diagnostics.authError || 'none'}`,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, active')
    .eq('id', authData.user.id)
    .maybeSingle();
  await supabase.auth.signOut();
  diagnostics.profileExists = Boolean(profile);
  diagnostics.profileError = profileError ? profileError.message || String(profileError) : '';
  diagnostics.profileRole = profile?.role || '';
  diagnostics.profileActive = typeof profile?.active === 'boolean' ? profile.active : null;

  if (profileError || !profile) {
    return {
      reasonCode: profileError ? 'profile-lookup-failed' : 'profile-missing',
      ready: true,
      ok: false,
      email,
      diagnostics,
      message: profileError
        ? `${label} Supabase sign-in succeeded, but profile lookup failed for user ${authData.user.id}. This can mean wrong project or profiles RLS is blocking the authenticated user. Error: ${diagnostics.profileError}`
        : `${label} Supabase sign-in succeeded, but no public.profiles row exists for user ${authData.user.id}.`,
    };
  }
  if (profile.role !== expectedRole) {
    return {
      reasonCode: 'profile-role-mismatch',
      ready: true,
      ok: false,
      email,
      diagnostics,
      message: `${label} profile role is ${profile.role || 'blank'}, but it must be ${expectedRole}.`,
    };
  }
  if (!profile.active) {
    return {
      reasonCode: 'profile-inactive',
      ready: true,
      ok: false,
      email,
      diagnostics,
      message: `${label} profile is inactive. Set active=true for this test user if appropriate.`,
    };
  }

  return {
    reasonCode: 'ok',
    ready: true,
    ok: true,
    email,
    diagnostics,
    message: `${label} QA login and staff profile are ready.`,
  };
}

function loadLocalEnv() {
  const sources = {};
  for (const key of Object.keys(process.env)) sources[key] = 'shell';
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.resolve(fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!process.env[key]) {
        process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
        sources[key] = fileName;
      }
    }
  }
  return sources;
}

function safeEnvSummary(sources) {
  return {
    qaAdminEmailPresent: Boolean(process.env.QA_ADMIN_EMAIL),
    qaCoachEmail: process.env.QA_COACH_EMAIL || '',
    qaCoachPasswordPresent: Boolean(process.env.QA_COACH_PASSWORD),
    supabaseHost: hostOnly(process.env.VITE_SUPABASE_URL),
    sources: {
      QA_ADMIN_EMAIL: sources.QA_ADMIN_EMAIL || 'not set',
      QA_ADMIN_PASSWORD: sources.QA_ADMIN_PASSWORD || 'not set',
      QA_COACH_EMAIL: sources.QA_COACH_EMAIL || 'not set',
      QA_COACH_PASSWORD: sources.QA_COACH_PASSWORD || 'not set',
      VITE_SUPABASE_URL: sources.VITE_SUPABASE_URL || 'not set',
      VITE_SUPABASE_ANON_KEY: sources.VITE_SUPABASE_ANON_KEY || 'not set',
    },
  };
}

function hostOnly(value) {
  try {
    return value ? new URL(value).host : '';
  } catch {
    return 'invalid-url';
  }
}
