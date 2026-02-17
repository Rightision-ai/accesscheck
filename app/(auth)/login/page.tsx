"use client";
import React, { useState } from "react";
import { User, Lock, ArrowRight, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { signIn, signUp } from "@/lib/auth/actions";
import { redirect } from "next/navigation";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success: server action handles redirect automatically
    // No try-catch needed - let redirect throw naturally
  };

  return (
    <div className="h-screen w-screen bg-linear-to-br from-[#0f0c29] to-[#301481] flex items-center justify-center fixed inset-0 z-9999">
      {/* Background decorative elements */}
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-(--secondary) blur-[150px] opacity-20 rounded-full"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-(--accent) blur-[180px] opacity-10 rounded-full"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[420px] p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-[20px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center mb-8">
          <img
            src="/assets/media/login-logo.png"
            alt="Homingo Logo"
            className="w-40 h-auto block mx-auto mb-6"
          />
          <h1 className="text-white text-xl font-bold mb-2 tracking-wide">
            Welcome Back
          </h1>
          <p className="text-white/60 text-[13px]">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && !loading && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-[#ff6b6b] text-xs mb-5 text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <div className="relative bg-white/5 rounded-xl border border-white/10 transition-all duration-200">
              <User size={18} className="absolute left-4 top-4 text-white/50" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 bg-transparent border-none text-white text-sm outline-none font-medium"
                required
              />
            </div>
          </div>

          <div className="mb-7">
            <div className="relative bg-white/5 rounded-xl border border-white/10">
              <Lock size={18} className="absolute left-4 top-4 text-white/50" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 bg-transparent border-none text-white text-sm outline-none font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#7654f6] border-none text-white text-sm font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.2)] disabled:cursor-wait hover:brightness-110 disabled:hover:brightness-100"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Authenticating...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-white/30 text-[13px]">
            Protected by Homingo Secure Access v2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
