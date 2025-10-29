const { createClient } = require('@supabase/supabase-js')

require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabaseAnon = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey || !supabaseAnon) {
  throw new Error('Missing supabase in environment variables')
}

const supabaseClient = createClient(supabaseUrl, supabaseKey, supabaseAnon)

module.exports = supabaseClient
