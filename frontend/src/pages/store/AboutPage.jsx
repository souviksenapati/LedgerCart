import { Users, TrendingUp, Award, ShieldCheck, Truck } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export default function AboutPage() {
  const settings = useSettings();
  const values = [
    { icon: Award, title: 'Quality Products', desc: 'We source from trusted brands and manufacturers to ensure you get the best.' },
    { icon: ShieldCheck, title: 'Trust & Transparency', desc: 'Honest pricing, genuine products, and accurate descriptions — always.' },
    { icon: Users, title: 'Expert Guidance', desc: 'Our knowledgeable staff helps you find the right tool for every job.' },
    { icon: TrendingUp, title: 'Competitive Pricing', desc: 'Best prices in the market with regular discounts and bulk deals.' },
    { icon: Truck, title: 'Fast Delivery', desc: 'Quick and reliable delivery across India with order tracking.' },
    { icon: Wrench, title: 'Wide Selection', desc: '10,000+ products across hand tools, power tools, plumbing, electrical, and more.' },
  ];

  const milestones = [
    { year: '2005', event: 'LedgerCart founded as a small shop in Balasore, Odisha.' },
    { year: '2010', event: 'Expanded to a full-size retail store with 5,000+ products.' },
    { year: '2015', event: 'Opened a second branch and started bulk supply for contractors.' },
    { year: '2020', event: 'Launched our online store to serve customers across India.' },
    { year: '2024', event: 'Crossed 50,000+ happy customers and 10,000+ product range.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">About LedgerCart</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Your trusted hardware partner since 2005. From a small shop in Balasore to serving customers across India — we bring quality tools and building materials right to your doorstep.
        </p>
      </div>

      {/* Story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">Our Story</h2>
          <p className="text-gray-600 mb-4">
            LedgerCart was founded in 2005 with a simple mission — provide quality hardware and tools at fair prices. What started as a small neighborhood shop has grown into one of the most trusted hardware stores in the region.
          </p>
          <p className="text-gray-600 mb-4">
            Over the years, we've built strong relationships with leading brands like Bosch, Stanley, Asian Paints, Havells, and many more. Our team of experienced staff members provides expert advice to help homeowners, contractors, and businesses find exactly what they need.
          </p>
          <p className="text-gray-600">
            In 2020, we took a big step forward by launching our online store, making our extensive product range accessible to customers across India. Today, we proudly serve over 50,000 happy customers.
          </p>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            {settings.store_logo_url
              ? <img src={settings.store_logo_url} alt={settings.store_name || 'LedgerCart'} className="h-20 w-auto mx-auto mb-4" />
              : <span className="text-4xl font-bold text-primary block mb-4">{settings.store_name || 'LedgerCart'}</span>
            }
            <p className="text-3xl font-bold text-primary">Since 2005</p>
            <p className="text-gray-500">Serving with Trust</p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose Us?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map(v => (
            <div key={v.title} className="card p-6 text-center hover:shadow-lg transition">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{v.title}</h3>
              <p className="text-sm text-gray-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Our Journey</h2>
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 -translate-x-1/2" />
          {milestones.map((m, i) => (
            <div key={m.year} className={`relative flex items-center mb-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
              <div className="flex-1 md:text-right md:pr-8 pl-10 md:pl-0">
                {i % 2 === 0 && <div className="card p-4"><span className="font-bold text-primary">{m.year}</span><p className="text-sm text-gray-600 mt-1">{m.event}</p></div>}
              </div>
              <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1/2 z-10" />
              <div className="flex-1 md:pl-8">
                {i % 2 !== 0 && <div className="card p-4"><span className="font-bold text-primary">{m.year}</span><p className="text-sm text-gray-600 mt-1">{m.event}</p></div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-primary text-white rounded-2xl p-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '19+', label: 'Years of Service' },
            { num: '50K+', label: 'Happy Customers' },
            { num: '10K+', label: 'Products' },
            { num: '100+', label: 'Brands' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold">{s.num}</p>
              <p className="text-sm text-white/80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
