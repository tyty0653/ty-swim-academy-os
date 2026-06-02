import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const outputPath = path.resolve('test-artifacts', 'ui-auth-preflight.json');

export default async function globalSetup() {
  loadLocalEnv();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const result = {
    createdAt: new Date().toISOString(),
    admin: await checkRole('ADMIN', 'Admin', 'admin'),
    coach: await checkRole('COACH', 'Coach', 'coach'),
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  for (const [key, value] of Object.entries({ Admin: result.admin, Coach: result.coach })) {
    const state = value.ok ? 'PASS' : value.ready ? 'FAIL' : 'SKIP';
    const email = value.email ? ` for ${value.email}` : '';
    console.log(`${key} QA login preflight: ${state}${email}. ${value.message}`);
  }
}

async function checkRole(envRole, label, expectedRole) {
  const email = process.env[`QA_${envRole}_EMAIL`];
  const password = process.env[`QA_${envRole}_PASSWORD`];
  if (!email || !password) {
    return {
      ready: false,
      ok: false,
      email: email || '',
      message: `Missing QA_${envRole}_EMAIL or QA_${envRole}_PASSWORD. Add them to .env.local or your shell to run authenticated UI checks.`,
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ready: false,
      ok: false,
      email,
      message: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add test Supabase env values before authenticated UI checks.',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) {
    return {
      ready: true,
      ok: false,
      email,
      message: `${label} QA login failed. Check QA_${envRole}_EMAIL / QA_${envRole}_PASSWORD. Password was not printed.`,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, active')
    .eq('id', authData.user.id)
    .maybeSingle();
  await supabase.auth.signOut();

  if (profileError || !profile) {
    return {
      ready: true,
      ok: false,
      email,
      message: `${label} login succeeded, but the staff profile is missing. Check the profiles row for this Auth user.`,
    };
  }
  if (profile.role !== expectedRole) {
    return {
      ready: true,
      ok: false,
      email,
      message: `${label} profile role is ${profile.role || 'blank'}, but it must be ${expectedRole}.`,
    };
  }
  if (!profile.active) {
    return {
      ready: true,
      ok: false,
      email,
      message: `${label} profile is inactive. Set active=true for this test user if appropriate.`,
    };
  }

  return {
    ready: true,
    ok: true,
    email,
    message: `${label} QA login and staff profile are ready.`,
  };
}

function loadLocalEnv() {
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
      if (!process.env[key]) process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}
