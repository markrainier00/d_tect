const { createClient } = require('@supabase/supabase-js')

require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing supabase in environment variables')
}

const supabaseClient = createClient(supabaseUrl, supabaseKey)

module.exports = supabaseClient
