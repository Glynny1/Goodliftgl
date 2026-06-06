import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'readline'

// Parse .env.local
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const [key, ...rest] = line.split('=')
      return [key.trim(), rest.join('=').trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Confirm before deleting
const rl = createInterface({ input: process.stdin, output: process.stdout })
rl.question('This will delete ALL submissions. Type "yes" to confirm: ', async answer => {
  rl.close()
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Cancelled.')
    process.exit(0)
  }

  const { error } = await supabase
    .from('submissions')
    .delete()
    .not('id', 'is', null)

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log('All submissions deleted.')
})
