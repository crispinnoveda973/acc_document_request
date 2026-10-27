import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../api';
import { Button, Field, inputCls } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [form, setForm] = useState({
    login: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);
    setErrors({});

    try {
      await login(form.login, form.password);
      nav('/');
    } catch (err) {
      setErrors(fieldErrors(err));

      toast(
        err.response?.status === 429
          ? 'Too many attempts. Please wait a minute.'
          : errMsg(err),
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-100 flex items-center justify-center p-4 sm:p-8">

      {/* Main Card */}
      <div className="w-full max-w-[1450px] overflow-hidden rounded-[22px] bg-white shadow-2xl">

        <div className="grid min-h-[780px] lg:grid-cols-2">

          {/* =========================
              LEFT SIDE
          ========================== */}
          <div className="relative hidden overflow-hidden lg:block">

            {/* School Campus Picture */}
            <img
              src="/acc_campus.png"
              alt="Abuyog Community College campus"
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Green Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-900/80 to-emerald-950/95" />

            {/* Decorative Shapes */}
            <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full border border-white/10" />

            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full border border-white/10" />

            <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full border-[20px] border-lime-300/15" />

            {/* Left Content */}
            <div className="relative z-10 flex h-full flex-col items-center justify-between px-10 py-12 text-white">

              {/* School Logo and Name */}
              <div className="text-center">

                <img
                  src="/logo.png"
                  alt="Abuyog Community College logo"
                  className="mx-auto h-40 w-40 object-contain drop-shadow-2xl"
                />

                <h2 className="mt-5 text-3xl font-extrabold tracking-wide">
                  ABUYOG
                </h2>

                <h2 className="text-3xl font-extrabold tracking-wide">
                  COMMUNITY COLLEGE
                </h2>

                <div className="mx-auto mt-5 h-1 w-24 rounded-full bg-lime-300" />

                <h3 className="mt-6 text-2xl font-bold">
                  Student Document Request
                </h3>

                <h3 className="text-2xl font-bold">
                  System
                </h3>

                <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/90">
                  Request your school documents
                  <br />
                  quickly and conveniently.
                </p>

              </div>

              {/* Features */}
              <div className="grid w-full max-w-lg grid-cols-3">

                {/* Fast Processing */}
                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">

                    <svg
                      className="h-7 w-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
                      />
                    </svg>

                  </div>

                  <p className="mt-3 text-sm font-semibold leading-5">
                    Fast
                    <br />
                    Processing
                  </p>

                </div>

                {/* Secure & Reliable */}
                <div className="border-x border-white/30 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">

                    <svg
                      className="h-7 w-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 3c-2.87 0-5.507 1.01-7.618 2.984A11.955 11.955 0 004 12c0 3.07 1.15 5.87 3.055 7.984A11.955 11.955 0 0012 21c2.87 0 5.507-1.01 7.618-2.984A11.955 11.955 0 0020 12c0-2.05-.52-3.98-1.382-5.664"
                      />
                    </svg>

                  </div>

                  <p className="mt-3 text-sm font-semibold leading-5">
                    Secure
                    <br />
                    &amp; Reliable
                  </p>

                </div>

                {/* For ACC Students */}
                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">

                    <svg
                      className="h-7 w-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a4 4 0 00-4-4h-1m-6 6H3v-2a4 4 0 014-4h3m6-5a4 4 0 110-8 4 4 0 010 8zM9 7a4 4 0 100-8 4 4 0 000 8z"
                      />
                    </svg>

                  </div>

                  <p className="mt-3 text-sm font-semibold leading-5">
                    For ACC
                    <br />
                    Students
                  </p>

                </div>

              </div>

            </div>
          </div>

          {/* =========================
              RIGHT SIDE
          ========================== */}
          <div className="flex items-center justify-center bg-white px-8 py-12 sm:px-14 lg:px-20">

            <form
              onSubmit={submit}
              className="w-full max-w-[570px]"
            >

              {/* Heading */}
              <div className="mb-10">

                <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">
                  WELCOME BACK!
                </p>

                <h1 className="mt-2 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                  Sign in to your account
                </h1>

                <p className="mt-5 text-lg leading-8 text-slate-500">
                  Access your requests, track your documents,
                  <br />
                  and more.
                </p>

              </div>

              {/* Email / Student ID */}
              <Field
                label="Email / Student ID"
                error={errors.login}
              >
                <div className="relative">

                  {/* User Icon */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">

                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 21a8 8 0 00-16 0"
                      />

                      <circle
                        cx="12"
                        cy="7"
                        r="4"
                      />
                    </svg>

                  </div>

                  <input
                    className={`${inputCls} h-16 pl-12 text-base`}
                    value={form.login}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        login: e.target.value,
                      })
                    }
                    placeholder="Enter your email or student ID"
                    required
                    autoFocus
                  />

                </div>
              </Field>

              {/* Password */}
              <div className="mt-6">

                <Field
                  label="Password"
                  error={errors.password}
                >
                  <div className="relative">

                    {/* Lock Icon */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">

                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="3"
                          y="10"
                          width="18"
                          height="11"
                          rx="2"
                        />

                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 10V7a5 5 0 0110 0v3"
                        />
                      </svg>

                    </div>

                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputCls} h-16 pl-12 pr-12 text-base`}
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      placeholder="Enter your password"
                      required
                    />

                    {/* Show / Hide Password */}
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >

                      {showPassword ? (
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
                          />

                          <circle
                            cx="12"
                            cy="12"
                            r="2.5"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3l18 18"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10.6 6.2A9.6 9.6 0 0122 12s-3.5 6-10 6a9.7 9.7 0 01-4.4-1"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.1 6.1A10.4 10.4 0 002 12s3.5 6 10 6"
                          />
                        </svg>
                      )}

                    </button>

                  </div>
                </Field>

              </div>

              {/* Forgot Password */}
              <div className="mt-3 flex justify-end">

                <button
                  type="button"
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Forgot Password?
                </button>

              </div>

              {/* Sign In Button */}
              <div className="mt-7">

                <Button
                  type="submit"
                  loading={busy}
                  className="w-full rounded-xl bg-emerald-700 py-4 text-lg font-bold shadow-md hover:bg-emerald-800"
                >
                  Sign In
                  <span className="ml-3 text-2xl">
                    →
                  </span>
                </Button>

              </div>

              {/* OR */}
              <div className="my-8 flex items-center gap-5">

                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-sm font-medium text-slate-400">
                  OR
                </span>

                <div className="h-px flex-1 bg-slate-200" />

              </div>

              {/* Register Link */}
              <p className="text-center text-base text-slate-600">

                Don&apos;t have an account?{' '}

                <Link
                  to="/register"
                  className="font-bold text-emerald-700 underline decoration-2 underline-offset-4 hover:text-emerald-900"
                >
                  Create an account
                </Link>

              </p>

            </form>

          </div>

        </div>
      </div>
    </div>
  );
}