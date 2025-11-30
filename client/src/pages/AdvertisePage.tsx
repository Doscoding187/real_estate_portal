import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { 
  BarChart3, 
  Target, 
  Users, 
  Megaphone, 
  Building2, 
  Briefcase, 
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdvertisePage() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavbar />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white pt-32 pb-20 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[100px]" />
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-in slide-in-from-left duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium text-blue-100">
                <TrendingUp className="h-4 w-4" />
                <span>South Africa's Fastest Growing Platform</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                Grow Your Business With <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Real Estate Portal</span>
              </h1>
              <p className="text-xl text-blue-100 max-w-xl leading-relaxed">
                Connect with millions of high-intent property buyers, sellers, and investors. 
                Leverage our data-driven advertising solutions to maximize your ROI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-lg h-14 px-8"
                  onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Start Advertising
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 font-medium text-lg h-14 px-8"
                >
                  Download Media Kit
                </Button>
              </div>
            </div>

            {/* Stats Card */}
            <div className="relative animate-in slide-in-from-right duration-700 delay-200">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white p-6">
                  <div className="text-4xl font-bold mb-2 text-blue-400">2M+</div>
                  <div className="text-sm text-blue-100">Monthly Active Users</div>
                </Card>
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white p-6">
                  <div className="text-4xl font-bold mb-2 text-cyan-400">150k+</div>
                  <div className="text-sm text-blue-100">Leads Generated/Mo</div>
                </Card>
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white p-6">
                  <div className="text-4xl font-bold mb-2 text-purple-400">500+</div>
                  <div className="text-sm text-blue-100">Developer Partners</div>
                </Card>
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white p-6">
                  <div className="text-4xl font-bold mb-2 text-pink-400">12k+</div>
                  <div className="text-sm text-blue-100">Active Agents</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Advertise Section */}
      <div className="py-20 bg-white">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Why Advertise With Us?</h2>
            <p className="text-lg text-slate-600">
              We provide precise targeting capabilities to ensure your brand reaches the right audience at the right time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Precision Targeting",
                description: "Target users based on location, budget, property type, and search behavior."
              },
              {
                icon: BarChart3,
                title: "Measurable ROI",
                description: "Real-time analytics dashboard to track impressions, clicks, and lead conversions."
              },
              {
                icon: Globe,
                title: "Massive Reach",
                description: "Access South Africa's largest network of property seekers and professionals."
              }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solutions Section */}
      <div className="py-20 bg-slate-50">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Tailored Solutions</h2>
            <p className="text-lg text-slate-600">
              Whether you're a developer, agent, or brand, we have the perfect advertising package for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Developer Solution */}
            <Card className="border-0 shadow-lg overflow-hidden group">
              <div className="h-2 bg-blue-500" />
              <CardContent className="p-8">
                <Building2 className="h-10 w-10 text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold mb-4">For Developers</h3>
                <ul className="space-y-3 mb-8">
                  {['Project Showcases', 'Featured Listings', 'Email Campaigns', 'Virtual Tours'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline">Learn More</Button>
              </CardContent>
            </Card>

            {/* Agent Solution */}
            <Card className="border-0 shadow-lg overflow-hidden group relative transform md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <div className="h-2 bg-indigo-500" />
              <CardContent className="p-8">
                <Users className="h-10 w-10 text-indigo-500 mb-6" />
                <h3 className="text-2xl font-bold mb-4">For Agents</h3>
                <ul className="space-y-3 mb-8">
                  {['Agent Branding', 'Lead Generation', 'Priority Ranking', 'Microsites'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Get Started</Button>
              </CardContent>
            </Card>

            {/* Brand Solution */}
            <Card className="border-0 shadow-lg overflow-hidden group">
              <div className="h-2 bg-purple-500" />
              <CardContent className="p-8">
                <Megaphone className="h-10 w-10 text-purple-500 mb-6" />
                <h3 className="text-2xl font-bold mb-4">For Brands</h3>
                <ul className="space-y-3 mb-8">
                  {['Display Banners', 'Sponsored Content', 'Newsletter Ads', 'Homepage Takeover'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      <div id="contact-form" className="py-20 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="bg-slate-900 p-10 text-white flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-bold mb-6">Let's Grow Together</h3>
                  <p className="text-slate-300 mb-8">
                    Fill out the form and our advertising team will get back to you within 24 hours with a custom proposal.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Sales Inquiry</p>
                        <p className="text-sm text-slate-400">sales@realestateportal.co.za</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Support</p>
                        <p className="text-sm text-slate-400">ads-support@realestateportal.co.za</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-10">
                  <p className="text-sm text-slate-500">
                    Trusted by 500+ top brands and developers across South Africa.
                  </p>
                </div>
              </div>

              <div className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Doe" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" type="email" placeholder="john@company.com" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">I am a...</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="developer">Property Developer</SelectItem>
                        <SelectItem value="agent">Real Estate Agent</SelectItem>
                        <SelectItem value="brand">Brand / Advertiser</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Tell us about your advertising goals..." 
                      className="min-h-[120px]"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                    Submit Inquiry
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
