export const dynamic = 'force-dynamic'

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <div className="container">
      <div className="auth-card">
        <h1>Admin</h1>
        {error === 'config' && <div className="auth-error">ADMIN_PASSWORD non è impostata su Railway.</div>}
        {error === '1' && <div className="auth-error">Password sbagliata.</div>}
        <form method="post" action="/api/admin/login" className="auth-form">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
          <button className="btn btn-blue" type="submit">
            Entra
          </button>
        </form>
      </div>
    </div>
  )
}
