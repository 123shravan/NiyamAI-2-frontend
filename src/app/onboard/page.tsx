'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';

export default function OnboardPage() {
  const { onboardingToken, completeOnboarding, error, clearError } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [state, setState] = useState('');
  const [website, setWebsite] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Redirect to login if no onboarding token.
  useEffect(() => {
    if (!onboardingToken) {
      router.replace('/login');
    }
  }, [onboardingToken, router]);

  if (!onboardingToken) {
    return null;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().length < 7) {
      newErrors.phone = 'Phone number must be valid';
    }

    if (!termsAgreed) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await completeOnboarding({
        onboarding_token: onboardingToken,
        full_name: fullName.trim(),
        phone: phone.trim(),
        designation: designation.trim() || null,
        org_name: orgName.trim() || null,
        org_type: orgType || null,
        state: state || null,
        website: website.trim() || null,
        terms_agreed: termsAgreed,
      });

      router.push('/dashboard');
    } catch {
      // Error is set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: string) => {
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Complete your profile</h1>
          <p className="text-blue-200 text-sm">Help us learn about you and your organization</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-400 text-xs font-semibold">✓</div>
            <span className="text-xs font-medium text-slate-300 hidden sm:inline">Verify Email</span>
          </div>
          <div className="w-8 h-8 bg-slate-600/50"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">2</div>
            <span className="text-xs font-medium text-white hidden sm:inline">Complete Profile</span>
          </div>
          <div className="w-8 h-8 bg-slate-600/50"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-600/50 border border-slate-500 flex items-center justify-center text-slate-400 text-xs font-semibold">3</div>
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">Done</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="card-glass p-8 shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* About You Section */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">About You</h2>
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      handleFieldChange('fullName');
                    }}
                    placeholder="Your full name"
                    className={`w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400 ${
                      errors.fullName ? 'border-red-300' : ''
                    }`}
                    required
                  />
                  {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      handleFieldChange('phone');
                    }}
                    placeholder="+91 98765 43210"
                    className={`w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400 ${
                      errors.phone ? 'border-red-300' : ''
                    }`}
                    required
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                {/* Designation */}
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Designation / Role <span className="text-xs text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="designation"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g., Environmental Manager"
                    className="w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Your Organization Section */}
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Organization</h2>
              <div className="space-y-4">
                {/* Organization Name */}
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Organization Name <span className="text-xs text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Your organization name"
                    className="w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400"
                  />
                </div>

                {/* Organization Type */}
                <div>
                  <label htmlFor="orgType" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Organization Type <span className="text-xs text-slate-500">(Optional)</span>
                  </label>
                  <select
                    id="orgType"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400"
                  >
                    <option value="">Select organization type</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Brand Owner">Brand Owner</option>
                    <option value="Importer">Importer</option>
                    <option value="Recycler">Recycler</option>
                    <option value="Waste Processor">Waste Processor</option>
                    <option value="Consultant">Consultant</option>
                    <option value="Regulator">Regulator</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1.5">
                    State of Primary Operations <span className="text-xs text-slate-500">(Optional)</span>
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400"
                  >
                    <option value="">Select state</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
                </div>

                {/* Website */}
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Website <span className="text-xs text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => {
                    setTermsAgreed(e.target.checked);
                    handleFieldChange('terms');
                  }}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="terms" className="flex-1 text-sm text-slate-700">
                  I agree to the <a href="#" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</a> <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.terms && <p className="mt-2 text-sm text-red-600">{errors.terms}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3.5 text-base mt-8"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Complete your profile'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/60 text-xs mt-6">
          © 2026 Niyam AI · Indian Environmental Law Intelligence Platform
        </p>
      </div>
    </div>
  );
}
