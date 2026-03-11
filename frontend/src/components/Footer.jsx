import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function Footer() {
  const settings = useSettings();
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            {settings.store_logo_url
              ? <img src={settings.store_logo_url} alt={settings.store_name || 'LedgerCart'} className="h-10 w-auto brightness-0 invert" />
              : <img src="/logo.svg" alt={settings.store_name || 'LedgerCart'} className="h-10 w-auto brightness-0 invert" />
            }
          </div>
          <p className="text-sm text-gray-400">Your one-stop shop for all hardware needs. From hand tools to power tools, plumbing to electrical — we have it all.</p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-primary-400">Shop</Link></li>
            <li><Link to="/about" className="hover:text-primary-400">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-primary-400">Contact Us</Link></li>
            <li><Link to="/faq" className="hover:text-primary-400">FAQ</Link></li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4 className="text-white font-semibold mb-4">Policies</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/terms" className="hover:text-primary-400">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-primary-400">Privacy Policy</Link></li>
            <li><Link to="/cancellation-refund" className="hover:text-primary-400">Cancellation & Refund</Link></li>
            <li><Link to="/shipping-exchange" className="hover:text-primary-400">Shipping & Exchange</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /> Main Road, Bhubaneswar,<br />Odisha 751001</li>
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> +91 98765 43210</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> info@ledgercart.com</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} LedgerCart. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}
