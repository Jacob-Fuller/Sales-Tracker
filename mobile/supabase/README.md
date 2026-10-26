# Abacus Board accounts (Supabase)

Accounts are optional in the app: everything works on the phone without one.
They switch on once these steps are done.

1. Create a new Supabase project called "Abacus Board" (region: Sydney).
2. SQL Editor: run `setup.sql` (change the email on the last lines to yours first).
3. Authentication -> Sign In / Providers -> Email: keep it on. Turn **Confirm email** on.
4. Authentication -> Emails -> "Magic Link" template: the app signs in with a
   6-digit code, so the email must show the code. Use:

       Subject: Your Abacus Board code
       Body:    <h2>Your Abacus Board code</h2><p style="font-size:28px;letter-spacing:4px"><b>{{ .Token }}</b></p><p>Enter it in the app to sign in. It expires in an hour.</p>

   Do the same for the "Confirm signup" template (new accounts get that one).
5. Authentication -> Emails -> SMTP: use your own mailbox (like the other apps),
   so the codes don't hit Supabase's low built-in sending limit.
6. Project Settings -> API: copy the Project URL and the publishable (anon) key
   into `src/lib/config.ts` (`SUPABASE_URL`, `SUPABASE_KEY`).

Accounts are optional, so App Review can use the whole app without one. If
Apple asks to test signing in, give them an email address whose inbox you can
read, and reply with the code in App Store Connect when they try it.
