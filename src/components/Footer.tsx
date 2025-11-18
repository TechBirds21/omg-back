// @ts-nocheck
import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { fetchSettings } from '@/lib/api-storefront';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [logoUrl, setLogoUrl] = useState<string>(import.meta.env.VITE_DEFAULT_LOGO_URL || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80');

  // Fetch logo from backend settings
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await fetchSettings();
        console.log('Settings received in Footer:', settings);
        
        // Handle different response structures
        let brand = (settings as any)?.brand;
        if (!brand && settings) {
          // Try direct access if brand is at root level
          brand = settings.brand;
        }
        
        console.log('Brand data in Footer:', brand);
        if (brand && typeof brand === 'object' && brand.logo_url) {
          console.log('Setting logo URL in Footer:', brand.logo_url);
          setLogoUrl(brand.logo_url);
        } else {
          // Try to get from seo.default_image as fallback
          const seo = (settings as any)?.seo;
          if (seo?.default_image) {
            console.log('Using SEO default image as logo (Footer):', seo.default_image);
            setLogoUrl(seo.default_image);
          } else {
            console.warn('No logo_url found in brand settings (Footer)');
          }
        }
      } catch (error) {
        console.warn('Failed to load logo from settings:', error);
      }
    };
    loadLogo();
  }, []);

  const quickLinks = [
    { name: 'Collections', href: '/collections' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Size Guide', href: '#' },
  ];

  const customerInfo = [
    { name: 'Shipping Info', href: '/shipping-info' },
    { name: 'Returns & Exchanges', href: '/returns-exchanges' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms-of-service' },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div 
                className="h-[4rem] w-[8rem] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${logoUrl})` }}
                aria-label="Omaguva Logo"
              ></div>
            </div>

            <p className="text-background/80 text-sm leading-relaxed">
              Discover our finest collection of handpicked sarees that blend traditional artistry with contemporary grace.
            </p>
            {/* Social Media Links - Commented out for now */}
            {/* <div className="flex space-x-4">
              <a href="#" className="text-background/60 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/60 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/60 hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div> */}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-background/80 hover:text-primary transition-colors text-sm">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-4">Customer Info</h3>
            <ul className="space-y-2">
              {customerInfo.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-background/80 hover:text-primary transition-colors text-sm">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-background/80 text-sm">+91 7680041607</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-background/80 text-sm">info@omaguva.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-background/80 text-sm">
                  Hyderabad,<br />
                  Telangana, India
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 mt-8 pt-8 text-center">
          <p className="text-background/60 text-sm">
            © {currentYear} Omaguva. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
