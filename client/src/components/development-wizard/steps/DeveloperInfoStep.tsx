import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Developer Information</h2>
        <p className="text-slate-600">Provide developer and contact details</p>
      </div>

      {/* Developer Name */}
      <div className="space-y-2">
        <Label htmlFor="developerName">
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
      <div className="flex items-center space-x-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <Checkbox
          id="featuredDealer"
          checked={isFeaturedDealer}
          onCheckedChange={(checked) => setIsFeaturedDealer(checked as boolean)}
        />
        <Label
          htmlFor="featuredDealer"
          className="text-sm font-medium cursor-pointer flex-1"
        >
          <span className="text-orange-700">Featured Dealer</span>
          <p className="text-xs text-slate-600 font-normal mt-1">
            Display a "Featured Dealer" badge on your development card
          </p>
        </Label>
      </div>

      {/* Contact Details */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-semibold text-slate-900">Contact Information</h3>

        <div className="space-y-2">
          <Label htmlFor="contactName">
            Contact Person Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contactName"
            placeholder="e.g., John Smith"
            value={contactDetails.name}
            onChange={(e) => updateContact('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="contact@example.com"
              value={contactDetails.email}
              onChange={(e) => updateContact('email', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="+27 82 123 4567"
              value={contactDetails.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredContact">Preferred Contact Method</Label>
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

      <div className="pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          This information will be used by potential buyers to contact you about the development
        </p>
      </div>
    </div>
  );
}
