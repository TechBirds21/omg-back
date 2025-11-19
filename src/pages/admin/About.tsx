// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { fetchAdminSetting, updateAdminSetting } from '@/lib/api-admin';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save, Crop, Scissors } from 'lucide-react';
import ImageCropper from '@/components/ImageCropper';

// Import saree image for deployment fallback
import sareeMaroon from '@/assets/saree-maroon.jpg';

interface AboutPageContent {
  id?: string;
  hero_title: string;
  hero_subtitle: string;
  story_title: string;
  story_content: string;
  mission_title: string;
  mission_content: string;
  story_image: string;
  values: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  stats: Array<{
    number: string;
    label: string;
  }>;
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
}

const About = () => {
  const [content, setContent] = useState<AboutPageContent>({
    hero_title: 'Our Story',
    hero_subtitle: 'O Maguva is born from a passion for preserving the timeless art of saree weaving while bringing it to the modern world.',
    story_title: 'Weaving Dreams into Reality',
    story_content: 'Founded with the vision to bridge the gap between traditional craftsmanship and contemporary fashion, O Maguva represents the perfect harmony of heritage and modernity.',
    mission_title: 'Our Mission',
    mission_content: 'To make authentic, high-quality sarees accessible to women worldwide while supporting traditional artisans.',
    story_image: sareeMaroon,
    values: [
      { title: 'Passion', description: 'Every saree is crafted with love and dedication.', icon: 'Heart' },
      { title: 'Quality', description: 'We never compromise on quality.', icon: 'Award' },
      { title: 'Authenticity', description: 'All our products are 100% authentic.', icon: 'Shield' },
      { title: 'Community', description: 'We support local artisans.', icon: 'Users' }
    ],
    stats: [
      { number: '500+', label: 'Unique Designs' },
      { number: '50+', label: 'Partner Artisans' },
      { number: '10,000+', label: 'Happy Customers' }
    ],
    cta_title: 'Experience the O Maguva Difference',
    cta_subtitle: 'Discover our exquisite collection and become part of our story',
    cta_button_text: 'Shop Our Collections'
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    setLoading(true);
    try {
      // Fetch from admin settings (stored as 'about' setting)
      const data = await fetchAdminSetting('about');
      if (data && typeof data === 'object') {
        setContent(data as AboutPageContent);
      }
    } catch (error) {
      console.error('Error fetching about content:', error);
      // Keep default content if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      // Save to admin settings (stored as 'about' setting)
      await updateAdminSetting('about', content);
      toast.success('About page content saved successfully!');
    } catch (error) {
      console.error('Error saving about content:', error);
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const addValue = () => {
    setContent(prev => ({
      ...prev,
      values: [...prev.values, { title: '', description: '', icon: 'Heart' }]
    }));
  };

  const removeValue = (index: number) => {
    setContent(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }));
  };

  const updateValue = (index: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      values: prev.values.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addStat = () => {
    setContent(prev => ({
      ...prev,
      stats: [...prev.stats, { number: '', label: '' }]
    }));
  };

  const removeStat = (index: number) => {
    setContent(prev => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index)
    }));
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      // Convert blob URL to file and upload
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `cropped-about-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // For now, we'll use a simple approach - convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setContent(prev => ({ ...prev, story_image: base64 }));
        setShowCropper(false);
        toast.success('Image cropped successfully!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      
      toast.error('Failed to crop image');
    }
  };

  const handleCropImage = () => {
    if (content.story_image) {
      setCropImageUrl(content.story_image);
      setShowCropper(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading about page content...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">About Page Management</h1>
        <Button onClick={saveContent} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero_title">Hero Title</Label>
            <Input
              id="hero_title"
              value={content.hero_title}
              onChange={(e) => setContent(prev => ({ ...prev, hero_title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
            <Textarea
              id="hero_subtitle"
              value={content.hero_subtitle}
              onChange={(e) => setContent(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              rows={3}
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Story Section */}
      <Card>
        <CardHeader>
          <CardTitle>Story Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="story_title">Story Title</Label>
            <Input
              id="story_title"
              value={content.story_title}
              onChange={(e) => setContent(prev => ({ ...prev, story_title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="story_content">Story Content</Label>
            <Textarea
              id="story_content"
              value={content.story_content}
              onChange={(e) => setContent(prev => ({ ...prev, story_content: e.target.value }))}
              rows={5}
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>
          <div>
            <Label htmlFor="story_image">Story Image</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const imageUrl = e.target?.result as string;
                      setContent(prev => ({ ...prev, story_image: imageUrl }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="story_image_upload"
              />
              <label
                htmlFor="story_image_upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-primary">Click to upload</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              </label>
            </div>
            {content.story_image && (
              <div className="mt-2 flex items-center gap-2">
                <img src={content.story_image} alt="Story preview" className="w-32 h-32 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCropImage}
                >
                  <Crop className="h-4 w-4 mr-2" />
                  Crop Image
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Values Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Our Values
            <Button size="sm" onClick={addValue}>
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.values.map((value, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Value {index + 1}</h4>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => removeValue(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={value.title}
                    onChange={(e) => updateValue(index, 'title', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Input
                    value={value.icon}
                    onChange={(e) => updateValue(index, 'icon', e.target.value)}
                    placeholder="Heart, Award, Shield, Users"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Description</Label>
                  <Textarea
                    value={value.description}
                    onChange={(e) => updateValue(index, 'description', e.target.value)}
                    rows={2}
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Statistics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Statistics
            <Button size="sm" onClick={addStat}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stat
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.stats.map((stat, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Statistic {index + 1}</h4>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => removeStat(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Number</Label>
                  <Input
                    value={stat.number}
                    onChange={(e) => updateStat(index, 'number', e.target.value)}
                    placeholder="500+"
                  />
                </div>
                <div>
                  <Label>Label</Label>
                  <Input
                    value={stat.label}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    placeholder="Unique Designs"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mission Section */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mission_title">Mission Title</Label>
            <Input
              id="mission_title"
              value={content.mission_title}
              onChange={(e) => setContent(prev => ({ ...prev, mission_title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="mission_content">Mission Content</Label>
            <Textarea
              id="mission_content"
              value={content.mission_content}
              onChange={(e) => setContent(prev => ({ ...prev, mission_content: e.target.value }))}
              rows={3}
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card>
        <CardHeader>
          <CardTitle>Call to Action Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cta_title">CTA Title</Label>
            <Input
              id="cta_title"
              value={content.cta_title}
              onChange={(e) => setContent(prev => ({ ...prev, cta_title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cta_subtitle">CTA Subtitle</Label>
            <Input
              id="cta_subtitle"
              value={content.cta_subtitle}
              onChange={(e) => setContent(prev => ({ ...prev, cta_subtitle: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cta_button_text">Button Text</Label>
            <Input
              id="cta_button_text"
              value={content.cta_button_text}
              onChange={(e) => setContent(prev => ({ ...prev, cta_button_text: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={4/5}
        title="Crop About Image"
      />
    </div>
  );
};

export default About;
