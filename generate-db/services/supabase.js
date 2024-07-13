import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
const supabase = createClient(
  "https://nkwarzrhzdxmzkbogbng.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rd2FyenJoemR4bXprYm9nYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg3NDcyMTQsImV4cCI6MjAzNDMyMzIxNH0.7K7shVq4DeF4daILDGSc0z1tLvCJIId22p7wbIitHE0"
);

export default supabase;
