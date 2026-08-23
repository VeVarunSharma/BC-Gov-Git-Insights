export function SignInGate() {
  return (
    <main className="sign-in-shell">
      <section className="sign-in-card">
        <span className="eyebrow">Protected portfolio intelligence</span>
        <h1>Sign in to BC Gov OpenGit Ministry</h1>
        <p>
          Access is limited to explicitly approved Microsoft Entra tenants.
          Email suffixes alone never grant authorization.
        </p>
        <a
          className="primary-action"
          href="/.auth/login/aad?post_login_redirect_uri=/"
        >
          Sign in with Microsoft
        </a>
      </section>
    </main>
  );
}
