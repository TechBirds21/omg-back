import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Truck, Clock, Package } from 'lucide-react';

const ShippingInfo = () => {

  const policyDetails = [
    {
      title: 'Flat-Rate Shipping',
      description: 'We offer a single, reliable shipping method for all orders.',
      icon: Truck
    },
    {
      title: '7-10 Working Days',
      description: 'Your order will be delivered to any location within India in 7-10 working days.',
      icon: Clock
    },
    {
      title: 'Free Shipping',
      description: 'All orders are shipped free of charge, with no minimum purchase required.',
      icon: Package
    }
  ];

  const deliveryProcess = [
    {
      step: '1',
      title: 'Order Confirmation',
      description: 'We confirm your order and begin processing within 24 hours.'
    },
    {
      step: '2',
      title: 'Quality Check & Packaging',
      description: 'Each product undergoes a thorough quality inspection and is carefully packaged.'
    },
    {
      step: '3',
      title: 'Dispatch & Tracking',
      description: 'Your order is dispatched, and tracking information will be sent to you via email and SMS.'
    },
    {
      step: '4',
      title: 'Delivery',
      description: 'Your package arrives at your doorstep within the specified delivery timeframe.'
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
              Shipping Information
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enjoy free, reliable delivery of your order with a consistent delivery time.
            </p>
          </div>
        </section>

        {/* Shipping Policy Overview */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8 text-center">
              Our Simple Shipping Policy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {policyDetails.map((policy, index) => (
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

        {/* Delivery Process */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8 text-center">
              How It Works
            </h2>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {deliveryProcess.map((process, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                      {process.step}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{process.title}</h3>
                      <p className="text-muted-foreground">{process.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Important Notes */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8 text-center">
              Important Notes
            </h2>

            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-foreground mb-3">Order Processing Time</h3>
                <p className="text-muted-foreground">
                  All orders are processed within 24-48 hours (excluding weekends and holidays). 
                  The delivery timeframe begins once your order has been dispatched.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-foreground mb-3">Tracking Your Order</h3>
                <p className="text-muted-foreground">
                  You will receive a tracking number via email and SMS once your order is shipped. 
                  This will allow you to track your package on the courier partner's website.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-foreground mb-3">Delivery Attempts</h3>
                <p className="text-muted-foreground">
                  Our courier partners will make up to 3 delivery attempts. If unsuccessful, 
                  the package will be returned to us.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ShippingInfo;
