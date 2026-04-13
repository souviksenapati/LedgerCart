import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Message sent successfully! We will get back to you soon.');
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    setSending(false);
  };

  const info = [
    { icon: MapPin, title: 'Visit Us', lines: ['LedgerCart Store', 'Near Main Market, Station Road', 'Balasore, Odisha 756001'] },
    { icon: Phone, title: 'Call Us', lines: ['+91 98765 43210', '+91 67890 12345', 'Mon-Sat: 9 AM - 8 PM'] },
    { icon: Mail, title: 'Email Us', lines: ['info@ledgercart.com', 'support@ledgercart.com'] },
    { icon: Clock, title: 'Working Hours', lines: ['Mon - Sat: 9:00 AM - 8:00 PM', 'Sunday: 10:00 AM - 4:00 PM', 'Public Holidays: Closed'] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-10">Have questions? We'd love to hear from you.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {info.map((item) => (
          <div key={item.title} className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{item.title}</h3>
            {item.lines.map((l, i) => <p key={i} className="text-sm text-gray-500">{l}</p>)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div className="card p-8">
          <h2 className="text-xl font-bold mb-6">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject *</label>
                <input className="input-field" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <textarea rows={5} className="input-field" value={form.message} onChange={e => setForm({...form, message: e.target.value})} required />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Map placeholder */}
        <div className="card overflow-hidden">
          <div className="bg-gray-100 h-full min-h-[400px] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapPin className="w-16 h-16 mx-auto mb-4" />
              <p className="font-medium text-lg">LedgerCart</p>
              <p className="text-sm">Near Main Market, Station Road</p>
              <p className="text-sm">Balasore, Odisha 756001</p>
              <p className="text-xs mt-4">Google Maps embed can be added here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
