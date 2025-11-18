import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Ban, Info, Clock, CheckCircle } from 'lucide-react';

const NoReturnsNoExchanges = () => {
  // Information points for a "No Returns" policy
  const policyPoints = [
    {
      title: 'Final Sale Policy',
      description: 'All sales are considered final and cannot be returned or exchanged.',
      icon: Ban
    },
    {
      title: 'Quality Assurance',
      description: 'Every product undergoes a strict quality check before shipping to ensure perfection.',
      icon: CheckCircle
    },
    {
      title: 'Product Information',
      description: 'Please review all product details and sizing charts carefully before making a purchase.',
      icon: Info
    },
    {
      title: 'Contact Us',
      description: 'For any queries regarding your order, please contact our support team.',
      icon: Clock
    }
  ];

  const contactInfo = [
    {
      title: 'Email Support',
      description: 'support@omaguva.com',
      details: 'Response within 24 hours'
    },
    {
      title: 'Phone Support',
      description: '+91 7680041607',
      details: 'Mon-Sat: 10 AM - 8 PM'
    },
    {
      title: 'WhatsApp',
      description: '+91 7680041607',
      details: 'Quick responses'
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Page Header */}
        <section className="py-16 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Returns & Exchanges Policy
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Please note: All sales are final. We do not accept returns or exchanges.              
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Refund will be credited within 7-10 working days to the original payment method.              
            </p>
          </div>
        </section>

        {/* Policy Overview */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8 text-center">
              Our Final Sale Policy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {policyPoints.map((policy, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <policy.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{policy.title}</h3>
                  <p className="text-muted-foreground text-sm">{policy.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-6">
              Questions About Your Order?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              While we do not accept returns, we are here to assist with any other order-related queries.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {contactInfo.map((contact, index) => (
                <div key={index} className="bg-card rounded-lg p-6 shadow-sm border">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{contact.title}</h3>
                  <p className="text-muted-foreground">{contact.description}</p>
                  <p className="text-sm text-muted-foreground mt-2">{contact.details}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NoReturnsNoExchanges;
