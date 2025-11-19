import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Shield, Eye, Lock, Users } from 'lucide-react';

const PrivacyPolicy = () => {
  const lastUpdated = `January 15, ${new Date().getFullYear()}`;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Page Header */}
        <section className="py-16 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Privacy Overview */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Data Protection</h3>
                <p className="text-muted-foreground text-sm">We use industry-standard security measures</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Transparency</h3>
                <p className="text-muted-foreground text-sm">Clear information about data usage</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Secure Storage</h3>
                <p className="text-muted-foreground text-sm">Encrypted data storage and transmission</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">User Control</h3>
                <p className="text-muted-foreground text-sm">You control your personal information</p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto prose prose-lg">
              <div className="bg-card rounded-lg p-8 shadow-sm border space-y-8">
                
                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">1. Information We Collect</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We collect information you provide directly to us, such as when you:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Create an account or make a purchase</li>
                      <li>Subscribe to our newsletter</li>
                      <li>Contact us for customer support</li>
                      <li>Participate in surveys or promotions</li>
                    </ul>
                    <p>This may include your name, email address, phone number, shipping address, and payment information.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">2. How We Use Your Information</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Process and fulfill your orders</li>
                      <li>Communicate with you about your orders and account</li>
                      <li>Send you marketing communications (with your consent)</li>
                      <li>Improve our products and services</li>
                      <li>Prevent fraud and ensure security</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">3. Information Sharing</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>With service providers who help us operate our business</li>
                      <li>To comply with legal obligations</li>
                      <li>To protect our rights and prevent fraud</li>
                      <li>With your explicit consent</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">4. Data Security</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>SSL encryption for data transmission</li>
                      <li>Secure servers and databases</li>
                      <li>Regular security audits</li>
                      <li>Limited access to personal information</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">5. Your Rights</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Access and update your personal information</li>
                      <li>Request deletion of your personal information</li>
                      <li>Opt-out of marketing communications</li>
                      <li>Request a copy of your data</li>
                      <li>Lodge a complaint with relevant authorities</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">6. Cookies and Tracking</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We use cookies and similar technologies to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Remember your preferences and settings</li>
                      <li>Analyze website traffic and usage</li>
                      <li>Provide personalized content and advertisements</li>
                      <li>Improve our website functionality</li>
                    </ul>
                    <p>You can control cookies through your browser settings.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">7. Children's Privacy</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">8. Changes to This Policy</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date.</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-4">9. Contact Us</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>If you have any questions about this privacy policy, please contact us:</p>
                    <ul className="list-none space-y-2">
                      <li><strong>Email:</strong> privacy@omaguva.com</li>
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

export default PrivacyPolicy;
