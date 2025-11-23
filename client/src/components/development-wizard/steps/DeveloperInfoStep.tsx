import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Building, User, Phone, Mail, Award, Contact } from 'lucide-react';

export function DeveloperInfoStep() {
  const {
    developerName,
    contactDetails,
    isFeaturedDealer,
    setDeveloperName,
    setContactDetails,
    setIsFeaturedDealer,
  } = useDevelopmentWizard();

  const updateContact = (field: string, value: string) => {
    setContactDetails({
      ...contactDetails,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Developer Details */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Developer Information</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="developerName" className="text-slate-700">
              Developer / Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="developerName"
              placeholder="e.g., Cosmopolitan Projects"
              value={developerName}
              onChange={(e) => setDeveloperName(e.target.value)}
            />
          </div>

          {/* Featured Dealer */}
          <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg transition-colors hover:bg-orange-100/50">
            <Checkbox
              id="featuredDealer"
              checked={isFeaturedDealer}
              onCheckedChange={(checked) => setIsFeaturedDealer(checked as boolean)}
              className="mt-1 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <Label
              htmlFor="featuredDealer"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              <div className="flex items-center gap-2 text-orange-700 font-bold mb-1">
                <Award className="w-4 h-4" />
                Featured Dealer
              </div>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Display a "Featured Dealer" badge on your development card to increase visibility and trust.
              </p>
            </Label>
          </div>
        </div>
      </Card>

      {/* Contact Details */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Contact className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactName" className="text-slate-700">
              Contact Person Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="contactName"
                placeholder="e.g., John Smith"
                value={contactDetails.name}
                onChange={(e) => updateContact('name', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-slate-700">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@example.com"
                  value={contactDetails.email}
                  onChange={(e) => updateContact('email', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-slate-700">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+27 82 123 4567"
                  value={contactDetails.phone}
                  onChange={(e) => updateContact('phone', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredContact" className="text-slate-700">Preferred Contact Method</Label>
            <Select
              value={contactDetails.preferredContact || 'email'}
              onValueChange={(value) => updateContact('preferredContact', value)}
            >
              <SelectTrigger id="preferredContact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Contact className="w-4 h-4" />
        <p>This information will be used by potential buyers to contact you about the development</p>
      </div>
    </div>
  );
}
