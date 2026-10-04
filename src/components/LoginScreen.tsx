import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, UserPlus, CheckCircle2 } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "../services/supabase";

interface LoginScreenProps {
  onLoginSuccess: (userEmail: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setError("Por favor, preencha o e-mail e a senha.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { data, error: authError } = await signInWithEmail(email, password);
        if (authError) {
          if (authError.message.includes("Invalid login credentials")) {
            setError("E-mail ou senha incorretos.");
          } else if (authError.message.includes("Email not confirmed")) {
            setError("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
          } else {
            setError(authError.message);
          }
          setIsLoading(false);
          return;
        }

        if (data?.user?.email) {
          onLoginSuccess(data.user.email);
        } else {
          onLoginSuccess(email.trim());
        }
      } else {
        const { data, error: authError } = await signUpWithEmail(email, password);
        if (authError) {
          if (authError.message.includes("already registered")) {
            setError("Este e-mail já está cadastrado. Faça login.");
          } else {
            setError(authError.message);
          }
          setIsLoading(false);
          return;
        }

        if (data?.session) {
          onLoginSuccess(data.user?.email || email.trim());
        } else {
          setSuccessMessage("Conta criada com sucesso! Se necessário, confirme seu e-mail ou faça login agora.");
          setMode("login");
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao conectar com o serviço de autenticação.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Visual accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md mb-3">
            <img
              src="/logo-artgian-cropped.png"
              alt="Artgian Studio"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.src = "/logo-artgian.png";
              }}
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Artgian <span className="text-indigo-400 font-semibold">Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Precificação Inteligente para Impressão 3D
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 p-7 sm:p-8">
          
          {/* Tabs: Entrar vs Criar Conta */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Criar Conta
            </button>
          </div>

          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {mode === "login" ? "Acesso Restrito" : "Novo Cadastro"}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === "login"
                  ? "Entre com seu e-mail e senha de acesso"
                  : "Crie seu usuário para isolar seus dados e configurações"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              {mode === "login" ? <ShieldCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Senha (apenas no modo cadastro) */}
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {/* Botão de Envio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span>{mode === "login" ? "Autenticando..." : "Criando conta..."}</span>
                ) : (
                  <>
                    <span>{mode === "login" ? "Entrar no Sistema" : "Cadastrar & Acessar"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Artgian Studio © 2026 · Protegido por Supabase Auth
        </p>

      </div>
    </div>
  );
};
