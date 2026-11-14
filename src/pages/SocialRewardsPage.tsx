import React, { useState } from 'react';
import { CheckCircle2, Clock, Copy, ExternalLink, Search, Upload, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';

export function SocialRewardsPage() {
  const { settings, customer, notify } = useStore();
  const social = settings?.social;
  const storeCfg = settings?.store;

  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'facebook' | 'youtube'>('instagram');
  const [username, setUsername] = useState('');
  const [customerName, setCustomerName] = useState(customer?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Status Checker
  const [checkPlatform, setCheckPlatform] = useState('instagram');
  const [checkUsername, setCheckUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    status: string;
    generatedCode: string | null;
    adminNote: string;
  } | null>(null);

  const channels = [
    {
      id: 'instagram' as const,
      name: 'Instagram',
      handle: social?.instagramHandle || '@prince_star_0617',
      url: social?.instagramUrl || 'https://instagram.com/prince_star_0617',
    },
    {
      id: 'tiktok' as const,
      name: 'TikTok',
      handle: social?.tiktokHandle || '@princestar_01',
      url: social?.tiktokUrl || 'https://tiktok.com/@princestar_01',
    },
    {
      id: 'facebook' as const,
      name: 'Facebook',
      handle: social?.facebookHandle || 'Prince Star',
      url: social?.facebookUrl || 'https://www.facebook.com/search/top?q=Prince%20Star',
    },
    {
      id: 'youtube' as const,
      name: 'YouTube',
      handle: social?.youtubeHandle || '@princestar_01',
      url: social?.youtubeUrl || 'https://youtube.com/@princestar_01',
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_200_000) {
      notify('Screenshot must be under 1.2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch<{ message: string }>('/api/social-verifications', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          username,
          customerName,
          customerEmail,
          customerPhone,
          proofUrl,
          proofNote,
        }),
      });
      setSubmitMessage(res.message);
      setCheckPlatform(platform);
      setCheckUsername(username);
      notify('Verification request submitted.', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to submit request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setChecking(true);
      const res = await apiFetch<{
        status: string;
        generatedCode: string | null;
        adminNote: string;
      }>(
        `/api/social-verifications/status?platform=${encodeURIComponent(
          checkPlatform
        )}&username=${encodeURIComponent(checkUsername.trim())}`
      );
      setStatusResult(res);
    } catch (err: unknown) {
      setStatusResult(null);
      notify(err instanceof Error ? err.message : 'No request found.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const rewardLabel =
    storeCfg?.socialDiscountType === 'fixed'
      ? `PKR ${(storeCfg?.socialDiscountValue ?? 500).toLocaleString()} Off`
      : `${storeCfg?.socialDiscountValue ?? 15}% Off`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A67C2E] dark:text-[#D4AF37]">
          Exclusive Member Reward · {rewardLabel}
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight text-balance">
          FOLLOW. VERIFY. UNLOCK YOUR EXCLUSIVE DISCOUNT.
        </h1>
        <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E]">
          Follow any official PRINCE STAR channel below, submit your username and proof of
          following, and our team will issue your unique checkout coupon upon manual verification.
        </p>
      </div>

      {/* Step 1: Official Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="p-5 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] flex flex-col justify-between gap-4"
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-[#78716C]">{ch.name}</p>
              <p className="font-semibold text-base mt-1">{ch.handle}</p>
            </div>
            <a
              href={ch.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold hover:opacity-90"
            >
              Follow {ch.name} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Step 2 & 3: Submit Form + Status Lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-8 space-y-4"
        >
          <h2 className="font-display text-2xl font-semibold">Submit Verification Request</h2>

          {submitMessage && (
            <div className="p-4 rounded bg-[#FAF9F6] dark:bg-[#1A1916] border border-[#A67C2E]/40 text-sm">
              {submitMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Platform Followed *</label>
              <select
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as 'instagram' | 'tiktok' | 'facebook' | 'youtube')
                }
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              >
                <option value="instagram">Instagram (@prince_star_0617)</option>
                <option value="tiktok">TikTok (@princestar_01)</option>
                <option value="facebook">Facebook (Prince Star)</option>
                <option value="youtube">YouTube (@princestar_01)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Your Social Username / Handle *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@your_username"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email (for coupon copy)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">WhatsApp / Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Screenshot Proof of Following (Optional / Recommended)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded border border-dashed border-[#D6CFC2] dark:border-[#33302A] cursor-pointer hover:border-[#A67C2E]">
              <Upload className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37]" />
              <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                {proofUrl ? 'Screenshot attached (click to replace)' : 'Upload screenshot (PNG/JPG, max 1.2 MB)'}
              </span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Note</label>
            <input
              type="text"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="e.g. Followed Instagram & liked recent watch reel"
              className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Submitting Request...' : 'Submit for Verification'}
          </button>
        </form>

        {/* Check Verification Status */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">Check Verification & Code</h2>
            <p className="text-xs text-[#78716C] mt-1">
              Once an administrator approves your follow, your unique coupon code appears right here.
            </p>
          </div>

          <form onSubmit={handleCheckStatus} className="space-y-3">
            <select
              value={checkPlatform}
              onChange={(e) => setCheckPlatform(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
            </select>
            <input
              type="text"
              required
              value={checkUsername}
              onChange={(e) => setCheckUsername(e.target.value)}
              placeholder="Enter submitted username"
              className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
            <button
              type="submit"
              disabled={checking}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded border border-[#111111] dark:border-[#D4AF37] text-xs font-semibold"
            >
              <Search className="w-3.5 h-3.5" />
              {checking ? 'Checking...' : 'Check Status'}
            </button>
          </form>

          {statusResult && (
            <div className="p-4 rounded bg-[#FAF9F6] dark:bg-[#0A0A0B] border border-[#E8E3D9] dark:border-[#262420] space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {statusResult.status === 'approved' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approved! Your Exclusive Coupon:</span>
                  </>
                )}
                {statusResult.status === 'pending' && (
                  <>
                    <Clock className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37]" />
                    <span>Pending Admin Review</span>
                  </>
                )}
                {statusResult.status === 'rejected' && (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Verification Not Approved</span>
                  </>
                )}
              </div>

              {statusResult.generatedCode && (
                <div className="flex items-center justify-between gap-2 p-3 rounded bg-[#111111] text-[#D4AF37]">
                  <span className="font-mono text-base font-bold tracking-wider">
                    {statusResult.generatedCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(statusResult.generatedCode!);
                      sessionStorage.setItem('ps_pending_coupon', statusResult.generatedCode!);
                      notify('Coupon copied & ready for checkout.', 'success');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-[#D4AF37] text-[#0A0A0B] px-2.5 py-1 rounded"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              )}

              {statusResult.adminNote && (
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">{statusResult.adminNote}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
