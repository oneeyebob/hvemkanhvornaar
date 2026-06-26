// Script til at ændre/nulstille en brugers kodeord.
//
// Brug 1 (opdater direkte i Supabase – kræver service_role-nøglen):
//   SUPABASE_URL="https://xxx.supabase.co" \
//   SUPABASE_KEY="din-service_role-nøgle" \
//   node scripts/set-password.js <brugernavn> <nyt-kodeord>
//
// Brug 2 (bare lav en bcrypt-hash til at indsætte manuelt i Supabase
// Table Editor → users → password_hash):
//   node scripts/set-password.js <brugernavn> <nyt-kodeord>
//
// Kodeordet ender i din terminal-historik – skift det evt. igen senere
// hvis det generer dig.

const bcrypt = require('bcryptjs');

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error('Brug: node scripts/set-password.js <brugernavn> <nyt-kodeord>');
  process.exit(1);
}

(async () => {
  const passwordHash = await bcrypt.hash(password, 10);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  // Ingen DB-oplysninger: print bare hashen til manuel indsættelse.
  if (!url || !key) {
    console.log('\nIngen SUPABASE_URL/SUPABASE_KEY fundet – opdaterer ikke databasen.');
    console.log('Kopiér denne hash ind i Supabase Table Editor → users → password_hash:\n');
    console.log(passwordHash + '\n');
    return;
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key, { db: { schema: 'public' } });

  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('username', username)
    .select('id, username, role');

  if (error) {
    console.error('\nFejl ved opdatering:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error(`\nIngen bruger fundet med brugernavn "${username}". Tjek stavningen.`);
    process.exit(1);
  }

  console.log(`\n✅ Kodeord opdateret for bruger "${data[0].username}" (rolle: ${data[0].role}).`);
})();
