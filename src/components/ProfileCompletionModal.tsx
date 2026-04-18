'use client';

import { useAuth } from '@/lib/authContext';
import { useState, useEffect } from 'react';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const ORG_TYPES = [
  "Manufacturer", "Brand Owner", "Importer", "Recycler", 
  "Waste Processor", "Consultant", "Regulator", "Other"
];

export default function ProfileCompletionModal() {
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    designation: '',
    org_name: '',
    org_type: '',
    state: '',
    website: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if profile is incomplete
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.phone) {
        setIsOpen(true);
        setFormData(prev => ({
          ...prev,
          name: user.name || ''
        }));
      } else {
        setIsOpen(false);
      }
    }
  }, [user, isAuthenticated, isLoading]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError("Full Name and Phone Number are required.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      await updateProfile(formData);
      // AuthContext updateProfile will fetch the new user profile
      // and update the state. The useEffect above will instantly close the modal.
    } catch (err: any) {
      setError(err.message || 'Failed to save profile details.');
      setSubmitting(false); // only re-enable if failed
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 text-white shadow-inner">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>
          <p className="text-white/80 text-sm mt-2">
            Just a few more details to personalize your Niyam AI experience.
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm border border-red-100 rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Optional Details</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      className="input-field text-sm py-2"
                      placeholder="e.g. Officer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Organization</label>
                    <input
                      type="text"
                      name="org_name"
                      value={formData.org_name}
                      onChange={handleChange}
                      className="input-field text-sm py-2"
                      placeholder="Company Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Org Type</label>
                    <select
                      name="org_type"
                      value={formData.org_type}
                      onChange={handleChange}
                      className="input-field text-sm py-2 px-3"
                    >
                      <option value="">Select...</option>
                      {ORG_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="input-field text-sm py-2 px-3"
                    >
                      <option value="">Select...</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="input-field text-sm py-2"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary py-3 rounded-xl shadow-md shadow-indigo-500/20 font-medium"
              >
                {submitting ? 'Saving Profile...' : 'Complete Setup & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
