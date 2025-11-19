// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import {
  Settings as SettingsIcon,
  Store,
  Mail,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Image as ImageIcon,
  Upload,
  Trash,
  LogOut,
  Scissors,
  Crop,
  CreditCard,
  Smartphone,
  Banknote
} from 'lucide-react';
import PaymentKeysManager from '@/components/PaymentKeysManager';
import { PaymentScheduleManager } from '@/components/PaymentScheduleManager';
import { ZohoOAuthTokenExchanger } from '@/components/ZohoOAuthTokenExchanger';
import { ZohoPayConfigCard } from '@/components/admin/ZohoPayConfigCard';
import {
  fetchAdminSettings,
  fetchAdminSetting,
  updateAdminSetting,
  uploadAdminImage,
  fetchPaymentConfigs,
  togglePaymentMethod,
  setPrimaryPaymentMethod,
  createPaymentConfig,
  PaymentConfig,
} from '@/lib/api-admin';
import { useAdminAuth } from '@/components/AdminAuth';

// Import saree images for deployment fallbacks
import sareeMaroon from '@/assets/saree-maroon.jpg';
import sareePink from '@/assets/saree-pink.jpg';
import sareePurple from '@/assets/saree-purple.jpg';
import { useToast } from '@/hooks/use-toast';
import ImageCropper from '@/components/ImageCropper';

const Settings = () => {
  const [saving, setSaving] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { logout } = useAdminAuth();
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading({ minimumDelay: 300, preserveData: true });

  const [storeSettings, setStoreSettings] = useState({
    store_name: 'O Maguva',
    store_description: 'Premium Saree Collections',
    store_email: 'info@omaguva.com',
    store_phone: '+91 7680041607',
    store_address: 'Hyderabad, Telangana, India',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });

  const [emailSettings, setEmailSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: 'noreply@omaguva.com',
    from_name: 'O Maguva'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    order_notifications: true,
    stock_alerts: true,
    customer_notifications: true,
    delivery_updates: true,
    low_stock_threshold: 10
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_auth: false,
    session_timeout: 30,
    password_expiry: 90,
    login_attempts: 5
  });

  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);

  const [heroSettings, setHeroSettings] = useState({
    title: 'O Maguva',
    subtitle: 'సాంప్రదాయం మరియు సంప్రదాయం',
    heading: 'Timeless Elegance',
    description: 'Discover the finest collection of handcrafted sarees that blend traditional artistry with contemporary grace.',
    images: [
      sareeMaroon,
      sareePink,
      sareePurple
    ],
    cta_primary_text: 'Explore Collections',
    cta_secondary_text: 'Our Story',
    title_font_size: '48px',
    title_font_weight: '700',
    title_color: '#000000',
    subtitle_font_size: '18px',
    subtitle_color: '#666666',
    description_font_size: '16px',
    description_color: '#888888',
    // New: font family controls
    title_font_family: '',
    subtitle_font_family: '',
    description_font_family: ''
  });

  const [aboutSettings, setAboutSettings] = useState({
    title: 'Our Story',
    subtitle: 'O Maguva is born from a passion for preserving the timeless art of saree weaving while bringing it to the modern world.',
    description: 'Every thread tells a story, every pattern holds tradition, and every saree is a celebration of Indian heritage.',
    story_title: 'Weaving Dreams into Reality',
    story_content: [
      'Founded with the vision to bridge the gap between traditional craftsmanship and contemporary fashion, O Maguva represents the perfect harmony of heritage and modernity.',
      'We work directly with skilled artisans from across India, ensuring that every saree is not just a garment, but a piece of art.',
      'From the intricate work of Banarasi silks to the delicate handloom cottons, each piece in our collection is carefully curated to meet the highest standards.'
    ],
    mission_title: 'Our Mission',
    mission_content: 'To make authentic, high-quality sarees accessible to women worldwide while supporting traditional artisans and preserving the rich heritage of Indian textiles.',
    values: [
      { title: 'Passion', description: 'Every saree is crafted with love and dedication to preserve our rich textile heritage.' },
      { title: 'Quality', description: 'We never compromise on quality, ensuring every piece meets the highest standards.' },
      { title: 'Authenticity', description: 'All our products are 100% authentic, sourced directly from skilled artisans.' },
      { title: 'Community', description: 'We support local artisans and contribute to the preservation of traditional crafts.' }
    ],
    stats: [
      { number: '500+', label: 'Unique Designs' },
      { number: '50+', label: 'Partner Artisans' },
      { number: '10,000+', label: 'Happy Customers' }
    ],
    cta_title: 'Experience the O Maguva Difference',
    cta_subtitle: 'Discover our exquisite collection and become part of our story',
    cta_button_text: 'Shop Our Collections',
    hero_image: sareeMaroon,
    title_font_size: '32px',
    title_font_weight: '600',
    title_color: '#000000',
    subtitle_font_size: '18px',
    subtitle_color: '#666666',
    description_font_size: '16px',
    description_color: '#888888',
    // New: font family controls
    title_font_family: '',
    subtitle_font_family: '',
    description_font_family: ''
  });

  const [companyLogo, setCompanyLogo] = useState({
    logo_url: '/logo.png',
    alt_text: 'O Maguva Logo',
    width: 200,
    height: 80
  });

  const [uploadingHeroImages, setUploadingHeroImages] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [cropImageIndex, setCropImageIndex] = useState(0);

  useEffect(() => {
    // Initial load - only run once on mount
    executeWithLoading(fetchSettings, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, [executeWithLoading]);

  const fetchSettings = async () => {
    try {
      const allSettings = await fetchAdminSettings();
      if (allSettings.hero_section) setHeroSettings(allSettings.hero_section as any);
      if (allSettings.about_section) setAboutSettings(allSettings.about_section as any);
      if (allSettings.company_logo) setCompanyLogo(allSettings.company_logo as any);
      if (allSettings.store_info) setStoreSettings(allSettings.store_info as any);
      if (allSettings.smtp_config) setEmailSettings(allSettings.smtp_config as any);
      if (allSettings.notification_preferences) setNotificationSettings(allSettings.notification_preferences as any);
      if (allSettings.security_config) setSecuritySettings(allSettings.security_config as any);

      // Load payment configurations
      try {
        const paymentData = await fetchPaymentConfigs();
        if (paymentData && paymentData.length > 0) {
      setPaymentConfigs(paymentData);
          
        } else {
          // If no data returned, create default configs
          
          try {
            const phonepeConfig = await createPaymentConfig({ 
              payment_method: 'phonepe',
              is_enabled: true, 
              is_primary: true 
            });
            const easebuzzConfig = await createPaymentConfig({ 
              payment_method: 'easebuzz',
              is_enabled: false, 
              is_primary: false 
            });
            const zohopayConfig = await createPaymentConfig({
              payment_method: 'zohopay',
              is_enabled: false,
              is_primary: false
            });
            
            setPaymentConfigs([phonepeConfig, easebuzzConfig, zohopayConfig]);
            
          } catch (createError) {
            
            // Set default configs in memory if creation fails
            setPaymentConfigs([
              {
                id: 'phonepe-default',
                payment_method: 'phonepe',
                is_enabled: true,
                is_primary: true,
                display_name: 'PhonePe',
                description: 'PhonePe UPI and wallet payments',
                configuration: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: 'easebuzz-default',
                payment_method: 'easebuzz',
                is_enabled: false,
                is_primary: false,
                display_name: 'Easebuzz',
                description: 'Easebuzz payment gateway with multiple options',
                configuration: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: 'zohopay-default',
                payment_method: 'zohopay',
                is_enabled: false,
                is_primary: false,
                display_name: 'Zoho Pay',
                description: 'Zoho Pay UPI/Cards/NetBanking',
                configuration: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);
          }
        }
      } catch (error) {
        
        // Set default configs if loading fails
        setPaymentConfigs([
          {
            id: 'phonepe-default',
            payment_method: 'phonepe',
            is_enabled: true,
            is_primary: true,
            display_name: 'PhonePe',
            description: 'PhonePe UPI and wallet payments',
            configuration: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'easebuzz-default',
            payment_method: 'easebuzz',
            is_enabled: false,
            is_primary: false,
            display_name: 'Easebuzz',
            description: 'Easebuzz payment gateway with multiple options',
            configuration: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'zohopay-default',
            payment_method: 'zohopay',
            is_enabled: false,
            is_primary: false,
            display_name: 'Zoho Pay',
            description: 'Zoho Pay UPI/Cards/NetBanking',
            configuration: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'razorpay-default',
            payment_method: 'razorpay',
            is_enabled: false,
            is_primary: false,
            display_name: 'Razorpay',
            description: 'Razorpay - Accept UPI, Cards, Net Banking & more',
            configuration: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'pinelabs-default',
            payment_method: 'pinelabs',
            is_enabled: false,
            is_primary: false,
            display_name: 'Pine Labs',
            description: 'Pine Labs - Complete payment solution',
            configuration: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      }
      
      return { heroData, aboutData, logoData, storeData, emailData, notificationData, securityData };
    } catch (error) {
      
      throw error;
    }
  };

  const handleSaveStoreSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('store_info', storeSettings);
      toast({
        title: "Settings Saved",
        description: "Store settings have been updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to save store settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeroSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('hero_section', heroSettings);
      toast({
        title: "Settings Saved",
        description: "Hero section settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAboutSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('about_section', aboutSettings);
      toast({
        title: "Settings Saved",
        description: "About section settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('smtp_config', emailSettings);
      toast({
        title: "Settings Saved",
        description: "Email settings have been updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to save email settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('notification_preferences', notificationSettings);
      toast({
        title: "Settings Saved",
        description: "Notification settings have been updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('security_config', securitySettings);
      toast({
        title: "Settings Saved",
        description: "Security settings have been updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to save security settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaymentMethod = async (paymentMethod: string, isEnabled: boolean) => {
    setSaving(true);
    try {
      if (isEnabled) {
        // Auto-switch: If enabling a method, disable all others first
        const otherMethods = paymentConfigs.filter(config => 
          config.payment_method !== paymentMethod && config.is_enabled
        );
        
        
        
        // Disable all other methods
        for (const method of otherMethods) {
          const result = await togglePaymentMethod(method.payment_method, false);
          if (!result) {
            
            try {
              await createPaymentConfig(method.payment_method, { is_enabled: false });
            } catch (createError) {
              
            }
          }
        }
        
        // Enable the selected method
        let enableResult = await togglePaymentMethod(paymentMethod, true);
        if (!enableResult) {
          
          try {
            enableResult = await createPaymentConfig(paymentMethod, { is_enabled: true, is_primary: true });
          } catch (createError) {
            throw new Error(`Failed to create payment config for ${paymentMethod}: ${createError}`);
          }
        }
        
        // Set as primary automatically
        const primaryResult = await setPrimaryPaymentMethod(paymentMethod);
        if (!primaryResult) {
          throw new Error(`Failed to set ${paymentMethod} as primary`);
        }
      
      toast({
          title: "Payment Gateway Auto-Switched",
          description: `${paymentMethod} has been enabled and set as primary. Other gateways have been automatically disabled.`,
        });
      } else {
        // If disabling a method, check if it's the primary
        const currentConfig = paymentConfigs.find(config => config.payment_method === paymentMethod);
        if (currentConfig?.is_primary) {
          // Auto-switch to another available method
          const availableMethods = paymentConfigs.filter(config => 
            config.payment_method !== paymentMethod && config.is_enabled
          );
          
          if (availableMethods.length > 0) {
            const fallbackMethod = availableMethods[0];
            
            
            // Set fallback as primary first
            let fallbackResult = await setPrimaryPaymentMethod(fallbackMethod.payment_method);
            if (!fallbackResult) {
              
              try {
                fallbackResult = await createPaymentConfig(fallbackMethod.payment_method, { is_enabled: true, is_primary: true });
              } catch (createError) {
                throw new Error(`Failed to create payment config for ${fallbackMethod.payment_method}: ${createError}`);
              }
            }
            
            // Then disable the current method
            const disableResult = await togglePaymentMethod(paymentMethod, false);
            if (!disableResult) {
              
              try {
                await createPaymentConfig(paymentMethod, { is_enabled: false });
              } catch (createError) {
                
              }
            }
            
            toast({
              title: "Payment Gateway Auto-Switched",
              description: `${paymentMethod} has been disabled. ${fallbackMethod.payment_method} is now the primary gateway.`,
            });
          } else {
            toast({
              title: "Cannot Disable Primary Gateway",
              description: "Please enable another payment gateway first before disabling this one.",
              variant: "destructive",
            });
            return;
          }
        } else {
          const disableResult = await togglePaymentMethod(paymentMethod, false);
          if (!disableResult) {
            
            try {
              await createPaymentConfig(paymentMethod, { is_enabled: false });
            } catch (createError) {
              
            }
          }
          toast({
            title: "Payment Gateway Disabled",
            description: `${paymentMethod} has been disabled.`,
          });
        }
      }
      
      // Reload payment configs
      const updatedConfigs = await fetchPaymentConfigs();
      setPaymentConfigs(updatedConfigs);
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to update payment method.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimaryPaymentMethod = async (paymentMethod: string) => {
    setSaving(true);
    try {
      const result = await setPrimaryPaymentMethod(paymentMethod);
      if (!result) {
        throw new Error(`Payment method ${paymentMethod} not found in database`);
      }
      // Reload payment configs
      const updatedConfigs = await fetchPaymentConfigs();
      setPaymentConfigs(updatedConfigs);
      toast({
        title: "Primary Payment Method Updated",
        description: `${paymentMethod} is now the primary payment method.`,
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to set primary payment method.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanyLogo = async () => {
    setSaving(true);
    try {
      await updateAdminSetting('company_logo', companyLogo);
      toast({
        title: "Settings Saved",
        description: "Company logo settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

    const handleHeroImageUpload = async (files: FileList | null, imageIndex: number) => {
    if (!files || files.length === 0) {
      toast({
        title: "No File Selected",
        description: "Please select an image file to upload.",
        variant: "destructive",
      });
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    

    setUploadingHeroImages(true);
    try {
      const uploadedUrl = await uploadAdminImage(file);
      
      
      // Open cropper for hero image
      setCropImageUrl(uploadedUrl);
      setCropImageIndex(imageIndex);
      setShowCropper(true);
      
      toast({
        title: "Upload Successful",
        description: "Image uploaded successfully. Please crop the image.",
      });
    } catch (error) {
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setUploadingHeroImages(false);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    
    try {
      // Convert blob URL to file and upload
      
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      
      
      const file = new File([blob], `cropped-hero-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      
      
      const uploadedUrl = await uploadAdminImage(file, 'hero');
      
      
      const newImages = [...heroSettings.images];
      newImages[cropImageIndex] = uploadedUrl;
      
      const updatedSettings = {
        ...heroSettings,
        images: newImages
      };
      
      setHeroSettings(updatedSettings);
      
      
      // Immediately save to database
      
      await updateAdminSetting('hero_section', updatedSettings);
      
      
      toast({
        title: "Image Cropped",
        description: "Hero image has been cropped and updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Crop Failed",
        description: `Failed to save cropped image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleCropHeroImage = (imageUrl: string, index: number) => {
    setCropImageUrl(imageUrl);
    setCropImageIndex(index);
    setShowCropper(true);
  };

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="default" rows={8} />;
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 relative">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm">
                <SettingsIcon className="h-5 w-5 text-white" />
              </div>
            <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-gray-600 text-sm">Manage your application settings</p>
            </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={logout}
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
          <TabsTrigger 
            value="store" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-blue-50"
          >
            <Store className="h-3 w-3" />
            <span className="text-xs font-medium">Store</span>
          </TabsTrigger>
          <TabsTrigger 
            value="hero" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-purple-50"
          >
            <ImageIcon className="h-3 w-3" />
            <span className="text-xs font-medium">Hero</span>
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-indigo-50"
          >
            <Globe className="h-3 w-3" />
            <span className="text-xs font-medium">About</span>
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-green-50"
          >
            <CreditCard className="h-3 w-3" />
            <span className="text-xs font-medium">Payments</span>
          </TabsTrigger>
          <TabsTrigger 
            value="email" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-orange-50"
          >
            <Mail className="h-3 w-3" />
            <span className="text-xs font-medium">Email</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-yellow-50"
          >
            <Bell className="h-3 w-3" />
            <span className="text-xs font-medium">Alerts</span>
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-red-50"
          >
            <Shield className="h-3 w-3" />
            <span className="text-xs font-medium">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store" className="space-y-4">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-md">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Store Configuration</h2>
                <p className="text-gray-600 text-sm">Manage your store information and settings</p>
            </div>
            </div>
          </div>

          {/* Store Settings Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-bold text-gray-900">Store Information</h3>
              <p className="text-gray-600 text-sm">Configure your store details and contact information</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name" className="text-sm font-semibold text-gray-900">Store Name</Label>
                  <Input
                    id="store_name"
                    value={storeSettings.store_name}
                    onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
                    className="h-9 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300"
                    placeholder="Enter your store name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_email" className="text-sm font-semibold text-gray-900">Store Email</Label>
                  <Input
                    id="store_email"
                    type="email"
                    value={storeSettings.store_email}
                    onChange={(e) => setStoreSettings({ ...storeSettings, store_email: e.target.value })}
                    className="h-9 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300"
                    placeholder="Enter your store email"
              />
            </div>
          </div>

              <div className="space-y-2">
                <Label htmlFor="store_description" className="text-sm font-medium text-gray-900">Store Description</Label>
                <Textarea
                  id="store_description"
                  value={storeSettings.store_description}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_description: e.target.value })}
                  rows={3}
                  className="resize-none focus:ring-blue-500 focus:border-blue-500"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="store_phone" className="text-sm font-medium text-gray-900">Store Phone</Label>
                  <Input
                    id="store_phone"
                    value={storeSettings.store_phone}
                    onChange={(e) => setStoreSettings({ ...storeSettings, store_phone: e.target.value })}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm font-medium text-gray-900">Currency</Label>
                  <Input
                    id="currency"
                    value={storeSettings.currency}
                    onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_address" className="text-sm font-medium text-gray-900">Store Address</Label>
                <Textarea
                  id="store_address"
                  value={storeSettings.store_address}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_address: e.target.value })}
                  rows={3}
                  className="resize-none focus:ring-blue-500 focus:border-blue-500"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button 
                  onClick={handleSaveStoreSettings} 
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Hero Section Settings */}
        <TabsContent value="hero" className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ImageIcon className="h-8 w-8 text-purple-600" />
              </div>
                <div>
                <h2 className="text-2xl font-bold text-gray-900">Hero Section Configuration</h2>
                <p className="text-gray-600 mt-1">Customize your homepage hero banner and featured content</p>
                </div>
            </div>
          </div>

          {/* Hero Settings Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-2xl font-bold text-gray-900">Hero Banner Settings</h3>
              <p className="text-gray-600 mt-2 text-lg">Configure the main banner that appears on your homepage</p>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-900">Title</Label>
                  <Input
                    id="title"
                    value={heroSettings.title}
                    onChange={(e) => setHeroSettings({ ...heroSettings, title: e.target.value })}
                    placeholder="O Maguva"
                    className="focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle" className="text-sm font-medium text-gray-900">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={heroSettings.subtitle}
                    onChange={(e) => setHeroSettings({ ...heroSettings, subtitle: e.target.value })}
                    placeholder="సాంప్రదాయం మరియు సంప్రదాయం"
                    className="focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

                    <div className="space-y-2">
                <Label htmlFor="hero_heading" className="text-sm font-medium text-gray-900">Main Heading</Label>
                        <Input
                  id="hero_heading"
                  value={heroSettings.heading}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heading: e.target.value })}
                  placeholder="Timeless Elegance"
                  className="focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

              <div className="space-y-2">
                <Label htmlFor="hero_description" className="text-sm font-medium text-gray-900">Description</Label>
                <Textarea
                  id="hero_description"
                  value={heroSettings.description}
                  onChange={(e) => setHeroSettings({ ...heroSettings, description: e.target.value })}
                  placeholder="Discover the finest collection..."
                  rows={3}
                  className="resize-none focus:ring-purple-500 focus:border-purple-500"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
                    </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                  <Label htmlFor="cta_primary" className="text-sm font-medium text-gray-900">Primary CTA Text</Label>
                        <Input
                    id="cta_primary"
                    value={heroSettings.cta_primary_text}
                    onChange={(e) => setHeroSettings({ ...heroSettings, cta_primary_text: e.target.value })}
                    placeholder="Explore Collections"
                    className="focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_secondary" className="text-sm font-medium text-gray-900">Secondary CTA Text</Label>
                  <Input
                    id="cta_secondary"
                    value={heroSettings.cta_secondary_text}
                    onChange={(e) => setHeroSettings({ ...heroSettings, cta_secondary_text: e.target.value })}
                    placeholder="Our Story"
                    className="focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  onClick={handleSaveHeroSettings}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Hero Settings'}
                </Button>
              </div>

              {/* Font and Color Styling */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-semibold">Typography & Colors</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title_font_size">Title Font Size</Label>
                    <Select
                      value={heroSettings.title_font_size}
                      onValueChange={(value) => setHeroSettings({ ...heroSettings, title_font_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24px">24px - Small</SelectItem>
                        <SelectItem value="32px">32px - Medium</SelectItem>
                        <SelectItem value="40px">40px - Large</SelectItem>
                        <SelectItem value="48px">48px - Extra Large</SelectItem>
                        <SelectItem value="56px">56px - XXL</SelectItem>
                        <SelectItem value="64px">64px - Huge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_font_weight">Title Font Weight</Label>
                    <Select
                      value={heroSettings.title_font_weight}
                      onValueChange={(value) => setHeroSettings({ ...heroSettings, title_font_weight: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font weight" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">300 - Light</SelectItem>
                        <SelectItem value="400">400 - Normal</SelectItem>
                        <SelectItem value="500">500 - Medium</SelectItem>
                        <SelectItem value="600">600 - Semi Bold</SelectItem>
                        <SelectItem value="700">700 - Bold</SelectItem>
                        <SelectItem value="800">800 - Extra Bold</SelectItem>
                        <SelectItem value="900">900 - Black</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_font_family">Title Font Family</Label>
                    <Input
                      id="title_font_family"
                      placeholder="e.g., Playfair Display, serif"
                      value={heroSettings.title_font_family || ''}
                      onChange={(e) => setHeroSettings({ ...heroSettings, title_font_family: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title_color">Title Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="title_color"
                        type="color"
                        value={heroSettings.title_color || "#000000"}
                        onChange={(e) => setHeroSettings({ ...heroSettings, title_color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={heroSettings.title_color || "#000000"}
                        onChange={(e) => setHeroSettings({ ...heroSettings, title_color: e.target.value })}
                        placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle_font_size">Subtitle Font Size</Label>
                    <Select
                      value={heroSettings.subtitle_font_size}
                      onValueChange={(value) => setHeroSettings({ ...heroSettings, subtitle_font_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px - Small</SelectItem>
                        <SelectItem value="14px">14px - Medium</SelectItem>
                        <SelectItem value="16px">16px - Normal</SelectItem>
                        <SelectItem value="18px">18px - Large</SelectItem>
                        <SelectItem value="20px">20px - Extra Large</SelectItem>
                        <SelectItem value="24px">24px - XXL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle_color">Subtitle Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="subtitle_color"
                        type="color"
                        value={heroSettings.subtitle_color || "#666666"}
                        onChange={(e) => setHeroSettings({ ...heroSettings, subtitle_color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={heroSettings.subtitle_color || "#666666"}
                        onChange={(e) => setHeroSettings({ ...heroSettings, subtitle_color: e.target.value })}
                        placeholder="#666666"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle_font_family">Subtitle Font Family</Label>
                    <Input
                      id="subtitle_font_family"
                      placeholder="e.g., Inter, sans-serif"
                      value={heroSettings.subtitle_font_family || ''}
                      onChange={(e) => setHeroSettings({ ...heroSettings, subtitle_font_family: e.target.value })}
                    />
                  </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="description_font_size">Description Font Size</Label>
                    <Select
                      value={heroSettings.description_font_size}
                      onValueChange={(value) => setHeroSettings({ ...heroSettings, description_font_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px - Small</SelectItem>
                        <SelectItem value="14px">14px - Medium</SelectItem>
                        <SelectItem value="16px">16px - Normal</SelectItem>
                        <SelectItem value="18px">18px - Large</SelectItem>
                        <SelectItem value="20px">20px - Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                        </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_color">Description Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="description_color"
                        type="color"
                        value={heroSettings.description_color || "#888888"}
                        onChange={(e) => setHeroSettings({ ...heroSettings, description_color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={heroSettings.description_color || "#888888"}
                        onChange={(e) => setHeroSettings({ ...heroSettings, description_color: e.target.value })}
                        placeholder="#888888"
                        className="flex-1"
                      />
                      </div>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_font_family">Description Font Family</Label>
                    <Input
                      id="description_font_family"
                      placeholder="e.g., Inter, sans-serif"
                      value={heroSettings.description_font_family || ''}
                      onChange={(e) => setHeroSettings({ ...heroSettings, description_font_family: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Hero Images Section */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-semibold">Hero Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`hero-image-${index}`}>
                        {index === 0 ? 'Main Image' : `Side Image ${index}`}
                      </Label>
                      <div className="relative">
                        <div className="aspect-[4/5] w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                          {heroSettings.images && heroSettings.images[index] ? (
                            <img
                              src={heroSettings.images[index]}
                              alt={`Hero ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to default image on error
                                const target = e.target as HTMLImageElement;
                                const fallbacks = [
                                  sareeMaroon,
                                  sareePink,
                                  sareePurple
                                ];
                                target.src = fallbacks[index] || sareeMaroon;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No image</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-2">
                          <Input
                            id={`hero-image-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleHeroImageUpload(e.target.files, index)}
                            disabled={uploadingHeroImages}
                            className="flex-1"
                          />
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Or enter image URL directly"
                              value={heroSettings.images?.[index] || ''}
                              onChange={(e) => {
                                const newImages = [...(heroSettings.images || [])];
                                newImages[index] = e.target.value;
                                setHeroSettings({ ...heroSettings, images: newImages });
                              }}
                              className="flex-1"
                            />
                      <Button
                              type="button"
                              variant="outline"
                        size="sm"
                              onClick={() => {
                                const newImages = [...(heroSettings.images || [])];
                                newImages[index] = '';
                                setHeroSettings({ ...heroSettings, images: newImages });
                              }}
                            >
                              Clear
                      </Button>
                          </div>
                          {heroSettings.images && heroSettings.images[index] && (
                      <Button
                              type="button"
                        variant="outline"
                        size="sm"
                              onClick={() => handleCropHeroImage(heroSettings.images[index], index)}
                              disabled={uploadingHeroImages}
                            >
                              <Crop className="h-4 w-4" />
                      </Button>
                  )}
                </div>
                      </div>
                    </div>
                  ))}
                </div>
                {uploadingHeroImages && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Uploading image...</span>
            </div>
          )}
              </div>

        </div>
      </div>
        </TabsContent>

        {/* About Section Settings */}
        <TabsContent value="about" className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Globe className="h-8 w-8 text-indigo-600" />
              </div>
        <div>
                <h2 className="text-2xl font-bold text-gray-900">About Section Configuration</h2>
                <p className="text-gray-600 mt-1">Customize your about page content and company information</p>
              </div>
        </div>
      </div>

          {/* About Settings Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">About Page Settings</h3>
              <p className="text-gray-600 mt-1">Configure your company story and information</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="about_title" className="text-sm font-medium text-gray-900">About Title</Label>
                  <Input
                    id="about_title"
                    value={aboutSettings.title}
                    onChange={(e) => setAboutSettings({ ...aboutSettings, title: e.target.value })}
                    placeholder="Our Story"
                    className="focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about_subtitle" className="text-sm font-medium text-gray-900">About Subtitle</Label>
                  <Input
                    id="about_subtitle"
                    value={aboutSettings.subtitle}
                    onChange={(e) => setAboutSettings({ ...aboutSettings, subtitle: e.target.value })}
                    placeholder="Brief intro about the company"
                    className="focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
          </div>

              <div className="space-y-2">
                <Label htmlFor="about_description" className="text-sm font-medium text-gray-900">About Description</Label>
                <Textarea
                  id="about_description"
                  value={aboutSettings.description}
                  onChange={(e) => setAboutSettings({ ...aboutSettings, description: e.target.value })}
                  rows={4}
                  className="resize-none focus:ring-indigo-500 focus:border-indigo-500"
                  style={{ whiteSpace: 'pre-wrap' }}
                  placeholder="Tell your story here..."
                />
              </div>

              {/* Typography & Colors */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-semibold">Typography & Colors</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="about_title_font_size">Title Font Size</Label>
                    <Select
                      value={aboutSettings.title_font_size || '32px'}
                      onValueChange={(value) => setAboutSettings({ ...aboutSettings, title_font_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20px">20px - Small</SelectItem>
                        <SelectItem value="24px">24px - Medium</SelectItem>
                        <SelectItem value="28px">28px - Large</SelectItem>
                        <SelectItem value="32px">32px - Extra Large</SelectItem>
                        <SelectItem value="36px">36px - XXL</SelectItem>
                        <SelectItem value="40px">40px - Huge</SelectItem>
                      </SelectContent>
                    </Select>
                      </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_title_font_weight">Title Font Weight</Label>
                    <Select
                      value={aboutSettings.title_font_weight || '600'}
                      onValueChange={(value) => setAboutSettings({ ...aboutSettings, title_font_weight: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font weight" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">300 - Light</SelectItem>
                        <SelectItem value="400">400 - Normal</SelectItem>
                        <SelectItem value="500">500 - Medium</SelectItem>
                        <SelectItem value="600">600 - Semi Bold</SelectItem>
                        <SelectItem value="700">700 - Bold</SelectItem>
                        <SelectItem value="800">800 - Extra Bold</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_title_font_family">Title Font Family</Label>
                    <Input
                      id="about_title_font_family"
                      placeholder="e.g., Playfair Display, serif"
                      value={aboutSettings.title_font_family || ''}
                      onChange={(e) => setAboutSettings({ ...aboutSettings, title_font_family: e.target.value })}
                    />
              </div>
          </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="about_title_color">Title Color</Label>
                    <div className="flex space-x-2">
                  <Input
                        id="about_title_color"
                        type="color"
                        value={aboutSettings.title_color || '#000000'}
                        onChange={(e) => setAboutSettings({ ...aboutSettings, title_color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={aboutSettings.title_color || '#000000'}
                        onChange={(e) => setAboutSettings({ ...aboutSettings, title_color: e.target.value })}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="about_subtitle_font_size">Subtitle Font Size</Label>
                    <Select
                      value={aboutSettings.subtitle_font_size || '18px'}
                      onValueChange={(value) => setAboutSettings({ ...aboutSettings, subtitle_font_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14px">14px - Small</SelectItem>
                        <SelectItem value="16px">16px - Medium</SelectItem>
                        <SelectItem value="18px">18px - Normal</SelectItem>
                        <SelectItem value="20px">20px - Large</SelectItem>
                        <SelectItem value="22px">22px - Extra Large</SelectItem>
                        <SelectItem value="24px">24px - XXL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_subtitle_color">Subtitle Color</Label>
                    <div className="flex space-x-2">
                  <Input
                        id="about_subtitle_color"
                        type="color"
                        value={aboutSettings.subtitle_color || '#666666'}
                        onChange={(e) => setAboutSettings({ ...aboutSettings, subtitle_color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={aboutSettings.subtitle_color || '#666666'}
                        onChange={(e) => setAboutSettings({ ...aboutSettings, subtitle_color: e.target.value })}
                        placeholder="#666666"
                        className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                    <Label htmlFor="about_subtitle_font_family">Subtitle Font Family</Label>
                <Input
                      id="about_subtitle_font_family"
                      placeholder="e.g., Inter, sans-serif"
                      value={aboutSettings.subtitle_font_family || ''}
                      onChange={(e) => setAboutSettings({ ...aboutSettings, subtitle_font_family: e.target.value })}
                />
              </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                    <Label htmlFor="about_description_font_size">Description Font Size</Label>
                    <Select
                      value={aboutSettings.description_font_size || '16px'}
                      onValueChange={(value) => setAboutSettings({ ...aboutSettings, description_font_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px - Small</SelectItem>
                        <SelectItem value="14px">14px - Medium</SelectItem>
                        <SelectItem value="16px">16px - Normal</SelectItem>
                        <SelectItem value="18px">18px - Large</SelectItem>
                        <SelectItem value="20px">20px - Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_description_color">Description Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="about_description_color"
                        type="color"
                        value={aboutSettings.description_color || '#888888'}
                        onChange={(e) => setAboutSettings({ ...aboutSettings, description_color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={aboutSettings.description_color || '#888888'}
                        onChange={(e) => setAboutSettings({ ...aboutSettings, description_color: e.target.value })}
                        placeholder="#888888"
                        className="flex-1"
                />
              </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_description_font_family">Description Font Family</Label>
                    <Input
                      id="about_description_font_family"
                      placeholder="e.g., Inter, sans-serif"
                      value={aboutSettings.description_font_family || ''}
                      onChange={(e) => setAboutSettings({ ...aboutSettings, description_font_family: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button 
                  onClick={handleSaveAboutSettings} 
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save About Settings'}
              </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Mail className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Email Configuration</h2>
                <p className="text-gray-600 mt-1">Configure your email settings and SMTP server</p>
              </div>
            </div>
          </div>

          {/* Email Settings Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">SMTP Settings</h3>
              <p className="text-gray-600 mt-1">Configure your email server settings for sending notifications</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="smtp_host" className="text-sm font-medium text-gray-900">SMTP Host</Label>
                <Input
                    id="smtp_host"
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="smtp_port" className="text-sm font-medium text-gray-900">SMTP Port</Label>
                <Input
                    id="smtp_port"
                    type="number"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: Number(e.target.value) })}
                    placeholder="587"
                    className="focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="smtp_username" className="text-sm font-medium text-gray-900">SMTP Username</Label>
                <Input
                    id="smtp_username"
                    type="email"
                    value={emailSettings.smtp_username}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_username: e.target.value })}
                    placeholder="your-email@gmail.com"
                    className="focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password" className="text-sm font-medium text-gray-900">SMTP Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={emailSettings.smtp_password}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                    placeholder="Your app password"
                    className="focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="from_email" className="text-sm font-medium text-gray-900">From Email</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={emailSettings.from_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, from_email: e.target.value })}
                    placeholder="noreply@omaguva.com"
                    className="focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_name" className="text-sm font-medium text-gray-900">From Name</Label>
                  <Input
                    id="from_name"
                    value={emailSettings.from_name}
                    onChange={(e) => setEmailSettings({ ...emailSettings, from_name: e.target.value })}
                    placeholder="O Maguva"
                    className="focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button 
                  onClick={handleSaveEmailSettings} 
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-4">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-md">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payment Gateway Configuration</h2>
                <p className="text-gray-600 text-sm">Manage your payment processing systems</p>
              </div>
            </div>
          </div>

          {/* Active Gateway Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Current Active Gateway</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
            {paymentConfigs.find(c => c.is_enabled && c.is_primary) ? (
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${
                  paymentConfigs.find(c => c.is_enabled && c.is_primary)?.payment_method === 'phonepe' 
                    ? 'bg-blue-100' 
                    : paymentConfigs.find(c => c.is_enabled && c.is_primary)?.payment_method === 'easebuzz'
                      ? 'bg-green-100'
                      : 'bg-purple-100'
                }`}>
                  {paymentConfigs.find(c => c.is_enabled && c.is_primary)?.payment_method === 'phonepe' && (
                    <Smartphone className="h-8 w-8 text-blue-600" />
                  )}
                  {paymentConfigs.find(c => c.is_enabled && c.is_primary)?.payment_method === 'easebuzz' && (
                    <CreditCard className="h-8 w-8 text-green-600" />
                  )}
                  {paymentConfigs.find(c => c.is_enabled && c.is_primary)?.payment_method === 'zohopay' && (
                    <Banknote className="h-8 w-8 text-purple-600" />
                  )}
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-900">
                    {paymentConfigs.find(c => c.is_enabled && c.is_primary)?.display_name}
                  </div>
                  <div className="text-gray-600">
                    {paymentConfigs.find(c => c.is_enabled && c.is_primary)?.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-red-100 rounded-lg w-fit mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-red-600 font-medium text-lg">No Active Gateway</p>
                <p className="text-gray-500">Configure a payment gateway to start processing payments</p>
              </div>
            )}
          </div>

          {/* Payment Gateway Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Gateway Configuration</h3>
              <p className="text-gray-600 text-sm">Enable or disable payment gateways and manage their settings</p>
            </div>
            
            <div className="p-4">
              {paymentConfigs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paymentConfigs.map((config, index) => (
                    <div key={config.id || config.payment_method || `payment-${index}`} className={`relative border-2 rounded-lg p-4 transition-all duration-300 hover:shadow-md ${
                      config.is_enabled 
                        ? 'border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 shadow-sm ring-1 ring-green-100' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}>
                      {/* Status Indicator */}
                      <div className="absolute top-4 right-4">
                        {config.is_enabled ? (
                          <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-800">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                            <span className="text-sm font-medium text-gray-600">Inactive</span>
                          </div>
                        )}
                      </div>

                      {/* Gateway Info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-2 rounded-lg shadow-sm ${
                          config.payment_method === 'phonepe'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                            : config.payment_method === 'easebuzz'
                              ? 'bg-gradient-to-br from-green-500 to-green-600'
                              : config.payment_method === 'razorpay'
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                                : config.payment_method === 'pinelabs'
                                  ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
                        }`}>
                          {config.payment_method === 'phonepe' && <Smartphone className="h-6 w-6 text-white" />}
                          {config.payment_method === 'easebuzz' && <CreditCard className="h-6 w-6 text-white" />}
                          {config.payment_method === 'zohopay' && <Banknote className="h-6 w-6 text-white" />}
                          {config.payment_method === 'razorpay' && <CreditCard className="h-6 w-6 text-white" />}
                          {config.payment_method === 'pinelabs' && <CreditCard className="h-6 w-6 text-white" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{config.display_name}</h4>
                          <p className="text-gray-600 text-sm">{config.description}</p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-900">Enable Gateway</h5>
                          <p className="text-xs text-gray-500">Turn this payment method on or off</p>
                        </div>
                        <Switch
                          checked={config.is_enabled}
                          onCheckedChange={(checked) => handleTogglePaymentMethod(config.payment_method, checked)}
                          disabled={saving}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>

                      {/* Date Range Selection */}
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-900 mb-2">Active Period</h5>
                          <p className="text-xs text-gray-500 mb-3">Schedule when this gateway should be active</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <Label htmlFor={`from-${config.id}`} className="text-xs font-medium text-gray-700">From Date</Label>
                            <Input
                              id={`from-${config.id}`}
                              type="date"
                              value={config.schedule_from_date || ''}
                              onChange={async (e) => {
                                const updatedConfigs = paymentConfigs.map(c => 
                                  c.id === config.id 
                                    ? { ...c, schedule_from_date: e.target.value }
                                    : c
                                );
                                setPaymentConfigs(updatedConfigs);
                                
                                // Save to database immediately
                                try {
                                  const { updatePaymentConfig } = await import('@/lib/supabase');
                                  await updatePaymentConfig(config.id, { schedule_from_date: e.target.value });
                                  toast({
                                    title: "Date Updated",
                                    description: "Schedule start date has been updated successfully.",
                                  });
                                } catch (error) {
                                  
                                  toast({
                                    title: "Update Failed",
                                    description: "Failed to update schedule date.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="mt-1 h-8 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-md"
                            />
                          </div>
                          <div className="flex items-center justify-center mt-4">
                            <span className="text-gray-400 text-xs font-medium">to</span>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`to-${config.id}`} className="text-xs font-medium text-gray-700">To Date</Label>
                            <Input
                              id={`to-${config.id}`}
                              type="date"
                              value={config.schedule_to_date || ''}
                              onChange={async (e) => {
                                const updatedConfigs = paymentConfigs.map(c => 
                                  c.id === config.id 
                                    ? { ...c, schedule_to_date: e.target.value }
                                    : c
                                );
                                setPaymentConfigs(updatedConfigs);
                                
                                // Save to database immediately
                                try {
                                  const { updatePaymentConfig } = await import('@/lib/supabase');
                                  await updatePaymentConfig(config.id, { schedule_to_date: e.target.value });
                                  toast({
                                    title: "Date Updated",
                                    description: "Schedule end date has been updated successfully.",
                                  });
                                } catch (error) {
                                  
                                  toast({
                                    title: "Update Failed",
                                    description: "Failed to update schedule date.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="mt-1 h-8 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-md"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Configuration Section */}
                      {config.payment_method === 'phonepe' && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <PaymentKeysManager
                            paymentMethod={config.payment_method}
                            displayName={config.display_name}
                            onKeysUpdated={() => {
                              fetchSettings();
                            }}
                          />
                        </div>
                      )}
                      
                      {config.payment_method === 'easebuzz' && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <PaymentKeysManager
                            paymentMethod={config.payment_method}
                            displayName={config.display_name}
                            onKeysUpdated={() => {
                              fetchSettings();
                            }}
                          />
                        </div>
                      )}

                      {config.payment_method === 'zohopay' && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <ZohoPayConfigCard
                            config={config}
                            onConfigUpdate={async () => {
                              const updatedConfigs = await fetchPaymentConfigs();
                              setPaymentConfigs(updatedConfigs);
                            }}
                          />
                        </div>
                      )}

                      {config.payment_method === 'razorpay' && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <PaymentKeysManager
                            paymentMethod={config.payment_method}
                            displayName={config.display_name}
                            onKeysUpdated={() => {
                              fetchSettings();
                            }}
                          />
                        </div>
                      )}

                      {config.payment_method === 'pinelabs' && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <PaymentKeysManager
                            paymentMethod={config.payment_method}
                            displayName={config.display_name}
                            onKeysUpdated={() => {
                              fetchSettings();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Gateways Configured</h3>
                  <p className="text-gray-600 mb-6">Set up your payment gateways to start processing customer payments</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-red-700">
                      Please check your database connection and ensure the payment_config table exists.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div> 

          {/* Note: ZohoPay is now integrated in the main payment gateway list above with toggle functionality */}
        </TabsContent>

        {/* Notification Preferences */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Bell className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                <p className="text-gray-600 mt-1">Configure your notification settings and alerts</p>
              </div>
            </div>
          </div>

          {/* Notification Settings Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Notification Settings</h3>
              <p className="text-gray-600 mt-1">Manage what notifications you want to receive</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900">Order Notifications</Label>
                    <p className="text-sm text-gray-500">Get notified when new orders are placed</p>
                  </div>
                  <Switch
                    checked={notificationSettings.order_notifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, order_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900">Stock Alerts</Label>
                    <p className="text-sm text-gray-500">Get notified when inventory is low</p>
                  </div>
                  <Switch
                    checked={notificationSettings.stock_alerts}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, stock_alerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900">Customer Notifications</Label>
                    <p className="text-sm text-gray-500">Get notified about customer inquiries and reviews</p>
                  </div>
                  <Switch
                    checked={notificationSettings.customer_notifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, customer_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900">Delivery Updates</Label>
                    <p className="text-sm text-gray-500">Get notified about delivery status changes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.delivery_updates}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, delivery_updates: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold" className="text-sm font-medium text-gray-900">Low Stock Threshold</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  value={notificationSettings.low_stock_threshold}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, low_stock_threshold: Number(e.target.value) })}
                  placeholder="10"
                  className="focus:ring-yellow-500 focus:border-yellow-500"
                />
                <p className="text-sm text-gray-500">Number of items remaining before stock alert is triggered</p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button 
                  onClick={handleSaveNotificationSettings} 
                  disabled={saving}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                <p className="text-gray-600 mt-1">Configure your security preferences and authentication settings</p>
              </div>
            </div>
          </div>

          {/* Security Settings Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Security Configuration</h3>
              <p className="text-gray-600 mt-1">Manage your security settings and access controls</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900">Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Enable 2FA for additional security</p>
                  </div>
                  <Switch
                    checked={securitySettings.two_factor_auth}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, two_factor_auth: checked })}
                  />
                </div>

              <div className="space-y-2">
                  <Label htmlFor="session_timeout" className="text-sm font-medium text-gray-900">Session Timeout (minutes)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    value={securitySettings.session_timeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, session_timeout: Number(e.target.value) })}
                    placeholder="30"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-500">Automatically log out after this many minutes of inactivity</p>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="password_expiry" className="text-sm font-medium text-gray-900">Password Expiry (days)</Label>
                  <Input
                    id="password_expiry"
                    type="number"
                    value={securitySettings.password_expiry}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, password_expiry: Number(e.target.value) })}
                    placeholder="90"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-500">Force password change after this many days</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login_attempts" className="text-sm font-medium text-gray-900">Max Login Attempts</Label>
                  <Input
                    id="login_attempts"
                    type="number"
                    value={securitySettings.login_attempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, login_attempts: Number(e.target.value) })}
                    placeholder="5"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-500">Number of failed attempts before account lockout</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button 
                  onClick={handleSaveSecuritySettings} 
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Security Settings'}
              </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Cropper Modal */}
      {showCropper && cropImageUrl && (
        <ImageCropper
          isOpen={showCropper}
          onClose={() => setShowCropper(false)}
          imageUrl={cropImageUrl}
          onCropComplete={handleCropComplete}
          aspectRatio={1.5}
        />
      )}
    </div>
  );
};

export default Settings;
