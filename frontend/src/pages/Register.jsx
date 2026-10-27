import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../api';
import { Button, Field, inputCls } from '../components/ui';

const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
];

const COURSES = [
  'Bachelor Elementary Education',
  'Bachelor of Secondary Education Major in English',
  'Bachelor of Secondary Education Major in Mathematics',
  'Bachelor of Secondary Education Major in Science',
  'Bachelor of Secondary Education Major in Social Studies',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Entrepreneurship',
  'Bachelor of Science in Information Technology',
];

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [f, setF] = useState({
    student_number: '',
    name: '',
    email: '',
    course: '',
    year_level: YEARS[0],
    contact_number: '',
    password: '',
    password_confirmation: '',
  });

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) =>
    setF({
      ...f,
      [k]: e.target.value,
    });

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);
    setErrors({});

    try {
      await register(f);
      toast('Account created. Welcome!');
      nav('/');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-100 flex items-center justify-center p-4 sm:p-8">

      {/* Main Card */}
      <div className="w-full max-w-[1450px] overflow-hidden rounded-[22px] bg-white shadow-2xl">

        <div className="grid min-h-[820px] lg:grid-cols-2">

          {/* =========================
              LEFT SIDE
          ========================== */}
          <div className="relative hidden overflow-hidden lg:block">

            {/* Campus Picture */}
            <img
              src="/acc_campus.png"
              alt="Abuyog Community College campus"
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Green Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-900/80 to-emerald-950/95" />

            {/* Decorative Circles */}
            <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full border border-white/10" />

            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full border border-white/10" />

            <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full border-[20px] border-lime-300/15" />

            {/* Left Content */}
            <div className="relative z-10 flex h-full flex-col items-center justify-between px-10 py-12 text-white">

              {/* Logo and School Name */}
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

                {/* Secure and Reliable */}
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

                {/* ACC Students */}
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
          <div className="flex items-center justify-center bg-white px-8 py-10 sm:px-14 lg:px-20">

            <form
              onSubmit={submit}
              className="w-full max-w-[600px]"
            >

              {/* Heading */}
              <div className="mb-7">

                <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">
                  GET STARTED
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Student registration
                </h1>

                <p className="mt-2 text-base text-slate-500">
                  Create your account to request documents.
                </p>

              </div>

              {/* Registration Fields */}
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">

                {/* Student ID */}
                <Field
                  label="Student ID Number"
                  error={errors.student_number}
                >
                  <input
                    className={`${inputCls} h-12`}
                    value={f.student_number}
                    onChange={set('student_number')}
                    required
                  />
                </Field>

                {/* Full Name */}
                <Field
                  label="Full Name"
                  error={errors.name}
                >
                  <input
                    className={`${inputCls} h-12`}
                    value={f.name}
                    onChange={set('name')}
                    required
                  />
                </Field>

                {/* Email */}
                <Field
                  label="Email"
                  error={errors.email}
                >
                  <input
                    type="email"
                    className={`${inputCls} h-12`}
                    value={f.email}
                    onChange={set('email')}
                    required
                  />
                </Field>

                {/* Contact Number */}
                <Field
                  label="Contact Number"
                  error={errors.contact_number}
                >
                  <input
                    className={`${inputCls} h-12`}
                    value={f.contact_number}
                    onChange={set('contact_number')}
                    required
                  />
                </Field>

                {/* Course / Program */}
                <Field
                  label="Course / Program"
                  error={errors.course}
                >
                  <select
                    className={`${inputCls} h-12`}
                    value={f.course}
                    onChange={set('course')}
                    required
                  >
                    <option value="">
                      Select your course / program
                    </option>

                    {COURSES.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Year Level */}
                <Field
                  label="Year Level"
                  error={errors.year_level}
                >
                  <select
                    className={`${inputCls} h-12`}
                    value={f.year_level}
                    onChange={set('year_level')}
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Password */}
                <Field
                  label="Password (min 8, letters + numbers)"
                  error={errors.password}
                >
                  <div className="relative">

                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputCls} h-12 pr-12`}
                      value={f.password}
                      onChange={set('password')}
                      required
                    />

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

                        /* Eye */
                        <svg
                          className="h-5 w-5"
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

                        /* Eye Off */
                        <svg
                          className="h-5 w-5"
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

                {/* Confirm Password */}
                <Field
                  label="Confirm Password"
                  error={errors.password_confirmation}
                >
                  <div className="relative">

                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      className={`${inputCls} h-12 pr-12`}
                      value={f.password_confirmation}
                      onChange={set('password_confirmation')}
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-700"
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >

                      {showConfirmPassword ? (

                        /* Eye */
                        <svg
                          className="h-5 w-5"
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

                        /* Eye Off */
                        <svg
                          className="h-5 w-5"
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

              {/* Create Account Button */}
              <div className="mt-6">

                <Button
                  type="submit"
                  loading={busy}
                  className="w-full rounded-xl bg-emerald-700 py-3.5 text-base font-bold shadow-md hover:bg-emerald-800"
                >
                  Create account
                </Button>

              </div>

              {/* Login Link */}
              <p className="mt-5 text-center text-sm text-slate-600">

                Already registered?{' '}

                <Link
                  to="/login"
                  className="font-bold text-emerald-700 underline decoration-2 underline-offset-4 hover:text-emerald-900"
                >
                  Log in
                </Link>

              </p>

            </form>

          </div>

        </div>
      </div>
    </div>
  );
}