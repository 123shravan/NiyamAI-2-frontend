'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';

export default function OnboardPage() {
  const { onboardingToken, completeOnboarding, error, clearError } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [state, setState] = useState('');
  const [website, setWebsite] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  useEffect(() => {
    if (!onboardingToken) router.replace('/login');
  }, [onboardingToken, router]);

  if (!onboardingToken) return null;

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #f0fdf9 0%, #e6fff5 50%, #f0fdf9 100%)' }}
    >
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(0, 133, 96, 0.08)' }} />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(0, 105, 76, 0.06)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden shadow-xl animate-fade-in-up"
          style={{ border: '1px solid #c9ffec' }}
        >
          {/* Green Gradient Header */}
          <div
            className="px-8 pt-8 pb-7 text-center"
            style={{ background: 'linear-gradient(135deg, #00694c 0%, #008560 100%)' }}
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ backgroundColor: 'rgba(201, 255, 236, 0.25)', backdropFilter: 'blur(8px)' }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Complete Your Profile</h1>
            <p className="text-sm" style={{ color: '#c9ffec' }}>
              Just a few more details to personalize your Niyam AI experience.
            </p>
          </div>

          {/* White Card Body */}
          <div className="bg-white px-8 py-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); handleFieldChange('fullName'); }}
                  placeholder="Your full name"
                  className={`w-full px-4 py-3 input-focus bg-white placeholder:text-slate-400 ${errors.fullName ? 'border-red-300' : ''}`}
                  style={{ color: '#002019' }}
                  required
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); handleFieldChange('phone'); }}
                  placeholder="+91 98765 43210"
                  className={`w-full px-4 py-3 input-focus bg-white placeholder:text-slate-400 ${errors.phone ? 'border-red-300' : ''}`}
                  style={{ color: '#002019' }}
                  required
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Optional Details Separator */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: '#e6fff5' }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-semibold tracking-widest uppercase" style={{ color: '#6d7a73' }}>
                    Optional Details
                  </span>
                </div>
              </div>

              {/* Designation + Organization (2-col) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    Designation
                  </label>
                  <input
                    id="designation"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Officer"
                    className="w-full px-3 py-3 input-focus bg-white placeholder:text-slate-400 text-sm"
                    style={{ color: '#002019' }}
                  />
                </div>
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    Organization
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Company Name"
                    className="w-full px-3 py-3 input-focus bg-white placeholder:text-slate-400 text-sm"
                    style={{ color: '#002019' }}
                  />
                </div>
              </div>

              {/* Org Type + State (2-col) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="orgType" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    Org Type
                  </label>
                  <select
                    id="orgType"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3 py-3 input-focus bg-white text-sm"
                    style={{ color: orgType ? '#002019' : '#94a3b8' }}
                  >
                    <option value="">Select...</option>
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
                <div>
                  <label htmlFor="state" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    State
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-3 input-focus bg-white text-sm"
                    style={{ color: state ? '#002019' : '#94a3b8' }}
                  >
                    <option value="">Select...</option>
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
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 input-focus bg-white placeholder:text-slate-400"
                  style={{ color: '#002019' }}
                />
              </div>

              {/* Terms */}
              <div className="pt-1">
                <div className="flex items-start gap-3">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => { setTermsAgreed(e.target.checked); handleFieldChange('terms'); }}
                    className="mt-1 w-4 h-4 rounded border-slate-300 cursor-pointer"
                    style={{ accentColor: '#008560' }}
                  />
                  <label htmlFor="terms" className="flex-1 text-sm" style={{ color: '#6d7a73' }}>
                    I agree to the{' '}
                    <a href="#" className="underline" style={{ color: '#008560' }}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="underline" style={{ color: '#008560' }}>Privacy Policy</a>
                    {' '}<span className="text-red-500">*</span>
                  </label>
                </div>
                {errors.terms && <p className="mt-2 text-sm text-red-600">{errors.terms}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-3.5 text-base mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Complete Setup & Continue'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: '#6d7a73' }}>
          © 2026 Niyam AI · Indian Environmental Law Intelligence Platform
        </p>
      </div>
    </div>
  );
}
