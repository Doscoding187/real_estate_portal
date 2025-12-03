import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Building, User, Phone, Mail, Contact, Upload, X, Info } from 'lucide-react';

export function DeveloperInfoStep() {
  const {
    contactDetails,
    companyLogo,
    setContactDetails,
    setCompanyLogo,
  } = useDevelopmentWizard();

  const updateContact = (field: string, value: string) => {
    setContactDetails({
      ...contactDetails,
      [field]: value,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCompanyLogo(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Development-Specific Contact Info */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">
            Development Contact Information
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Provide contact details specific to this development. Buyers will use
          this information to inquire about units.
        </p>

        <div className="space-y-4">
          {/* Company Logo for this Development */}
          <div className="space-y-2">
            <Label className="text-slate-700">
              Development Logo (Optional)
            </Label>
            <p className="text-xs text-slate-500 mb-2">
              Upload a specific logo for this development (different from your
              company logo if needed)
            </p>
            <div className="flex items-center gap-4">
              {companyLogo && (
                <div className="relative w-24 h-24 border-2 border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={companyLogo}
                    alt="Development logo"
                    className="w-full h-full object-contain bg-white"
                  />
                  <button
                    onClick={() => setCompanyLogo('')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="flex-1">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      {companyLogo ? 'Change Logo' : 'Upload Development Logo'}
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG up to 2MB. Square format recommended.
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Contact Details */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Contact className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">
            Contact Person Details
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Who should buyers contact about this specific development?
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactName" className="text-slate-700">
              Contact Person Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="contactName"
                placeholder="e.g., John Smith (Sales Agent)"
                value={contactDetails.name}
                onChange={(e) => updateContact('name', e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-500">
              This could be a sales agent, project manager, or yourself
            </p>
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
                  placeholder="sales@development.com"
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
            <Label htmlFor="preferredContact" className="text-slate-700">
              Preferred Contact Method
            </Label>
            <Select
              value={contactDetails.preferredContact || 'email'}
              onValueChange={(value) => updateContact('preferredContact', value)}
            >
              <SelectTrigger id="preferredContact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="phone">📞 Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Info Note */}
      <div className="flex items-start gap-2 text-sm text-slate-500 px-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <div>
          <p className="font-medium text-blue-900 mb-1">
            About Developer Profile Information:
          </p>
          <p className="text-xs text-blue-800">
            Your company details, track record, and past projects are pulled
            from your <strong>Developer Profile</strong>. To update those
            details, please visit your profile settings. This section focuses on
            contact information specific to this development.
          </p>
        </div>
      </div>
    </div>
  );
}
