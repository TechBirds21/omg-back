// @ts-nocheck
import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, Instagram, Youtube, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitContactForm, fetchSettings } from '@/lib/api-storefront';
import { useToast } from '@/hooks/use-toast';
import { validateEmail, validateMobileNumber, getValidationClass, handlePhoneInput } from '@/lib/validations';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ' ',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [contactInfo, setContactInfo] = useState({
    email: 'info@omaguva.com',
    phone: '+91 7680041607',
    whatsapp: '917680041607',
    address: 'Hyderabad\nTelangana, India'
  });
  const [businessHours, setBusinessHours] = useState({
    monday_friday: '10:00 AM - 8:00 PM',
    saturday: '10:00 AM - 6:00 PM',
    sunday: '12:00 PM - 5:00 PM'
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSettings();
        
        if (settings?.brand) {
          setContactInfo({
            email: settings.brand.support_email || 'info@omaguva.com',
            phone: settings.brand.support_phone || '+91 7680041607',
            whatsapp: settings.brand.support_phone?.replace(/\D/g, '') || '917680041607',
            address: settings.brand.address || 'Hyderabad\nTelangana, India'
          });
        }
        
        // Business hours can be set from settings if available
        if (settings?.business_hours) {
          setBusinessHours(settings.business_hours);
        }
      } catch (error) {
        // Use defaults if settings fail to load
      }
    };

    loadSettings();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Real-time validation for email and phone
    if (field === 'email' && value.trim()) {
      const emailValidation = validateEmail(value);
      if (!emailValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, email: emailValidation.message || '' }));
      }
    } else if (field === 'phone' && value.trim()) {
      const phoneValidation = validateMobileNumber(value);
      if (!phoneValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, phone: phoneValidation.message || '' }));
      }
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur
    if (field === 'email' && formData.email.trim()) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, email: emailValidation.message || '' }));
      }
    } else if (field === 'phone' && formData.phone.trim()) {
      const phoneValidation = validateMobileNumber(formData.phone);
      if (!phoneValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, phone: phoneValidation.message || '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await submitContactForm({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message
      });
      
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const businessHoursArray = [
    { day: 'Monday - Friday', hours: businessHours.monday_friday },
    { day: 'Saturday', hours: businessHours.saturday },
    { day: 'Sunday', hours: businessHours.sunday }
  ];

  const contactDetails = [
    {
      icon: Mail,
      label: 'Email',
      value: contactInfo.email,
      link: `mailto:${contactInfo.email}`
    },
    {
      icon: Phone,
      label: 'Phone',
      value: contactInfo.phone,
      link: `tel:${contactInfo.phone.replace(/\s/g, '')}`
    },
    {
      icon: MapPin,
      label: 'Address',
      value: contactInfo.address,
      link: null
    }
  ];

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', href: '#', color: 'text-pink-500' },
    { icon: Youtube, label: 'YouTube', href: '#', color: 'text-red-500' },
    { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/${contactInfo.whatsapp}`, color: 'text-green-500' }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Page Header */}
        <section className="py-16 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We'd love to hear from you. Get in touch with our team for any inquiries about our saree collections.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div className="space-y-8">
                <h2 className="text-2xl font-serif font-bold text-foreground">
                  Get in Touch
                </h2>

                {/* Contact Details */}
                <div className="space-y-6">
                  {contactDetails.map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.label}</h3>
                        {item.link ? (
                          <a 
                            href={item.link}
                            className="text-muted-foreground hover:text-primary transition-colors whitespace-pre-line"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-muted-foreground whitespace-pre-line">
                            {item.value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Business Hours */}
                <div>
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-4">
                    Business Hours
                  </h3>
                  <div className="space-y-3">
                    {businessHoursArray.map((schedule, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-muted-foreground">{schedule.day}</span>
                        <span className="font-medium text-foreground">{schedule.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-4">
                    Follow Us
                  </h3>
                  <div className="flex gap-4">
                    {socialLinks.map((social, index) => (
                      <a
                        key={index}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-12 h-12 rounded-full border-2 border-border flex items-center justify-center transition-all hover:scale-110 ${social.color}`}
                        aria-label={social.label}
                      >
                        <social.icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-card rounded-lg p-8 shadow-sm">
                <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
                  Send us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => handleFieldBlur('email')}
                        placeholder="Enter your email"
                        required
                        className={getValidationClass(!validationErrors.email, touchedFields.email)}
                      />
                      {validationErrors.email && touchedFields.email && (
                        <p className="text-sm text-red-500">{validationErrors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          const formattedPhone = handlePhoneInput(e.target.value);
                          handleInputChange('phone', formattedPhone);
                        }}
                        onBlur={() => handleFieldBlur('phone')}
                        placeholder="9876543210"
                        className={getValidationClass(!validationErrors.phone, touchedFields.phone)}
                        maxLength={10}
                      />
                      {validationErrors.phone && touchedFields.phone && (
                        <p className="text-sm text-red-500">{validationErrors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Select onValueChange={(value) => handleInputChange('subject', value === '_placeholder_' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_placeholder_">Select a subject</SelectItem>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="product">Product Question</SelectItem>
                          <SelectItem value="order">Order Support</SelectItem>
                          <SelectItem value="custom">Custom Order</SelectItem>
                          <SelectItem value="wholesale">Wholesale Inquiry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Tell us about your inquiry..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
