import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://tzebnkefmrnmsujqlvfo.supabase.co").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZWJua2VmbXJubXN1anFsdmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDE5OTgsImV4cCI6MjA5MzMxNzk5OH0.HsqKlX5RRPyY9FIEjzDWMiJE0PI8Mx8qlJ_58HqGELA").trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: async (name, acquireTimeout, fn) => await fn(),
  },
})
