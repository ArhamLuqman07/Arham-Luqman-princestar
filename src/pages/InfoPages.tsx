import React, { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';

export function AboutPage() {
  const { navigate } = useStore();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A67C2E] dark:text-[#D4AF37]">
            Our Heritage · Karianwala, Gujrat
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">
            The House of PRINCE STAR
          </h1>
          <p className="text-base text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            Founded in Karianwala, District Gujrat, Pakistan, PRINCE STAR — LUXURY LIFESTYLE was
            established with one conviction: Pakistani gentlemen deserve watches, eyewear, leather
            goods, footwear, and tailoring crafted with international precision and honest local
            accessibility.
          </p>
          <p className="text-base text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            Every timepiece, full-grain calfskin wallet, and hand-welted loafer undergoes strict
            multi-point quality inspection before leaving our Gujrat studio.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            Explore the Collection
          </button>
        </div>
        <div className="lg:col-span-6 aspect-[4/3] rounded-lg overflow-hidden border border-[#E8E3D9] dark:border-[#262420]">
          <SafeImage
            src="/src/assets/images/hero_menswear_footwear_1794663410443.jpg"
            alt="PRINCE STAR Showroom"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings, notify } = useStore();
  const general = settings?.general;
  const whatsappClean = (general?.whatsappNumber || '923076817272').replace(/\D/g, '');

  const [type, setType] = useState<'contact' | 'complaint'>('contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch<{ message: string }>('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          type,
          name,
          email,
          phone,
          orderNumber,
          subject,
          message,
        }),
      });
      setSentMessage(res.message);
      setSubject('');
      setMessage('');
      notify('Message received by PRINCE STAR Support.', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to send message.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-[#E8E3D9] dark:border-[#262420] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
          Client Concierge & Resolution
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">Contact PRINCE STAR</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold">Official Studio & Desk</h2>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37] mt-0.5 shrink-0" />
                <span>{general?.address || 'Karianwala, District Gujrat, Pakistan'}</span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37] shrink-0" />
                <span className="font-mono">{general?.contactPhone || '+92 307 6817272'}</span>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37] shrink-0" />
                <a
                  href={`mailto:${general?.complaintEmail || 'princestar.store@gmail.com'}`}
                  className="hover:underline"
                >
                  {general?.complaintEmail || 'princestar.store@gmail.com'}
                </a>
              </p>
            </div>
            <a
              href={`https://wa.me/${whatsappClean}`}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-[#128C7E] text-white text-xs font-semibold hover:bg-[#075E54]"
            >
              <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
            </a>
          </div>

          {/* Configurable Google Maps Embed */}
          <div className="rounded-lg overflow-hidden border border-[#E8E3D9] dark:border-[#262420] h-64 bg-[#EFECE5] dark:bg-[#181715]">
            <iframe
              title="PRINCE STAR Location Map"
              src={
                general?.googleMapsUrl ||
                'https://www.google.com/maps?q=Karianwala,Gujrat,Pakistan&output=embed'
              }
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-8 space-y-4"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('contact')}
              className={`px-4 py-2 rounded text-xs font-semibold ${
                type === 'contact'
                  ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                  : 'bg-[#F2EFE8] dark:bg-[#1C1B18]'
              }`}
            >
              General Inquiry
            </button>
            <button
              type="button"
              onClick={() => setType('complaint')}
              className={`px-4 py-2 rounded text-xs font-semibold ${
                type === 'complaint'
                  ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                  : 'bg-[#F2EFE8] dark:bg-[#1C1B18]'
              }`}
            >
              File a Complaint
            </button>
          </div>

          {sentMessage && (
            <div className="p-4 rounded bg-[#FAF9F6] dark:bg-[#1A1916] border border-[#A67C2E]/40 text-sm">
              {sentMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Full Name *"
              className="px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address *"
              className="px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile / WhatsApp Number"
              className="px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
            />
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Order Number (optional)"
              className="px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
            />
          </div>

          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject *"
            className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
          />

          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === 'complaint'
                ? 'Please describe your concern and order reference so our resolution desk can assist immediately...'
                : 'How can our concierge assist you today?'
            }
            className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90"
          >
            {submitting
              ? 'Sending...'
              : type === 'complaint'
              ? 'Submit Complaint'
              : 'Send Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function PolicyPage({
  title,
  kicker,
  sections,
}: {
  title: string;
  kicker: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="border-b border-[#E8E3D9] dark:border-[#262420] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
          {kicker}
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">{title}</h1>
      </div>
      <div className="space-y-6">
        {sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
