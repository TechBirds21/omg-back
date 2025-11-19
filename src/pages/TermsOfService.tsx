import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FileText, Scale, CreditCard, Truck } from 'lucide-react';

const TermsOfService = () => {
  const lastUpdated = `January 15, ${new Date().getFullYear()}`;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Page Header */}
        <section className="py-16 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Please read these terms carefully before using our services.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Terms Overview */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Agreement</h3>
                <p className="text-muted-foreground text-sm">Legal agreement between you and O Maguva</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scale className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Fair Use</h3>
                <p className="text-muted-foreground text-sm">Guidelines for responsible use of our services</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Payment Terms</h3>
                <p className="text-muted-foreground text-sm">Clear payment and refund policies</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Delivery Terms</h3>
                <p className="text-muted-foreground text-sm">Shipping and delivery conditions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto prose prose-lg">
              <div className="bg-card rounded-lg p-8 shadow-sm border space-y-8">
                
                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>By accessing and using the O Maguva website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">2. Use License</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Permission is granted to temporarily download one copy of the materials on O Maguva's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Modify or copy the materials</li>
                      <li>Use the materials for any commercial purpose or for any public display</li>
                      <li>Attempt to reverse engineer any software contained on the website</li>
                      <li>Remove any copyright or other proprietary notations from the materials</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">3. Product Information</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We strive to provide accurate product information, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Product descriptions, colors, and materials</li>
                      <li>Pricing and availability</li>
                      <li>Care instructions and fabric details</li>
                    </ul>
                    <p>However, we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free. Colors may vary due to monitor settings and photography conditions.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">4. Orders and Payment</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>By placing an order, you agree to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Provide accurate and complete information</li>
                      <li>Pay all charges incurred by you or any users of your account</li>
                      <li>Accept responsibility for any taxes applicable to your purchase</li>
                    </ul>
                    <p>We reserve the right to refuse or cancel orders for any reason, including but not limited to product availability, errors in product or pricing information, or suspected fraudulent activity.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">5. Pricing and Availability</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>All prices are subject to change without notice. We reserve the right to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Modify or discontinue products at any time</li>
                      <li>Correct pricing errors, even after an order has been placed</li>
                      <li>Limit quantities available for purchase</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">6. Shipping and Delivery</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Shipping terms and conditions:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Delivery times are estimates and not guaranteed</li>
                      <li>Risk of loss passes to you upon delivery to the carrier</li>
                      <li>You are responsible for providing accurate delivery information</li>
                      <li>Additional charges may apply for remote locations</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">7. Returns and Refunds</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Our return policy allows for returns within 30 days of delivery, subject to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Items being in original condition with tags attached</li>
                      <li>Compliance with our returns and exchanges policy</li>
                      <li>Refunds processed to original payment method</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">8. Intellectual Property</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of O Maguva and is protected by copyright and other intellectual property laws.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">9. Limitation of Liability</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>In no event shall O Maguva or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on O Maguva's website.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">10. Governing Law</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>These terms and conditions are governed by and construed in accordance with the laws of India, and you irrevocably submit to the exclusive jurisdiction of the courts in Hyderabad, Telangana.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">11. Contact Information</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>If you have any questions about these Terms of Service, please contact us:</p>
                    <ul className="list-none space-y-2">
                      <li><strong>Email:</strong> legal@omaguva.com</li>
                      <li><strong>Phone:</strong> +91 7680041607</li>
                      <li><strong>Address:</strong> Hyderabad, Telangana, India</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
