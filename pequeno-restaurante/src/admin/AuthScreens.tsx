import { useState } from "react";
import type { AdminRepository } from "../data/repository";
import { Alert, useAction } from "./ui";

export function LoginScreen({ repo, onSignedIn }: { repo: AdminRepository; onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const { busy, error, success, run } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (forgot) {
      const redirectTo = window.location.origin + window.location.pathname;
      run(() => repo.requestPasswordReset(email.trim(), redirectTo), "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.");
    } else {
      run(async () => {
        await repo.signIn(email.trim(), password);
        onSignedIn();
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Painel do cardápio</h1>
      <p className="mt-1 text-warmgray">{forgot ? "Informe o e-mail para receber o link de nova senha." : "Entre com o e-mail e a senha de administrador."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            E-mail
          </label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </div>
        {!forgot && (
          <div>
            <label htmlFor="senha" className="label">
              Senha
            </label>
            <input id="senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          </div>
        )}
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Aguarde…" : forgot ? "Enviar link" : "Entrar"}
        </button>
        <button type="button" className="w-full text-sm text-warmgray underline underline-offset-2" onClick={() => setForgot(!forgot)}>
          {forgot ? "Voltar para o login" : "Esqueci minha senha"}
        </button>
      </form>
    </main>
  );
}

export function NewPasswordScreen({ repo, onDone }: { repo: AdminRepository; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, run, setError } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError("Use pelo menos 10 caracteres.");
    if (password !== confirm) return setError("As senhas não são iguais.");
    run(async () => {
      await repo.updatePassword(password);
      onDone();
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Criar nova senha</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="nova" className="label">
            Nova senha
          </label>
          <input id="nova" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="conf" className="label">
            Repita a nova senha
          </label>
          <input id="conf" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" />
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Salvando…" : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
