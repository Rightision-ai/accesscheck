"use client";
import React, { useState } from "react";
import { User, Lock, ArrowRight, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { signIn, signUp } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import Image from "next/image";

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
    <div className="h-screen w-screen bg-white flex items-center justify-center fixed inset-0 z-[9999]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[420px] p-10 rounded-3xl bg-white border border-slate-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)]"
      >
        <div className="text-center mb-8">
          <img
            src="/login-logo.png"
            alt="AccessCheck Logo"
            className="w-40 h-auto block mx-auto mb-6"
          />
          <h1 className="text-slate-900 text-xl font-bold mb-2 tracking-wide">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-xs">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && !loading && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-600 text-xs mb-5 text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <div className="relative bg-slate-50 rounded-xl border border-slate-200 transition-all duration-200 focus-within:border-primary focus-within:bg-white">
              <User
                size={18}
                className="absolute left-4 top-4 text-slate-400"
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 bg-transparent border-none text-slate-900 text-sm outline-none font-medium placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <div className="mb-7">
            <div className="relative bg-slate-50 rounded-xl border border-slate-200 transition-all duration-200 focus-within:border-primary focus-within:bg-white">
              <Lock
                size={18}
                className="absolute left-4 top-4 text-slate-400"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 bg-transparent border-none text-slate-900 text-sm outline-none font-medium placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary border-none text-white text-sm font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(15,183,91,0.35)] disabled:cursor-wait hover:brightness-110 disabled:hover:brightness-100"
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

        <div className="mt-8 text-center space-y-1">
          <p className="text-slate-400 text-[10px] tracking-wide">
            Powered by{" "}
            <Image
              src="/assets/media/homingo-logo.png"
              alt="Homingo"
              width={50}
              height={50}
              className="h-8 ml-2 w-auto"
            />
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
