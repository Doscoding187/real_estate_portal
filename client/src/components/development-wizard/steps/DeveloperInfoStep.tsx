import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Building,
  User,
  Phone,
  Mail,
  Award,
  Contact,
  Upload,
  Globe,
  FileText,
  Trophy,
  Briefcase,
  Plus,
  X,
  Info,
} from 'lucide-react';
import { useState } from 'react';

export function DeveloperInfoStep() {
  const {
    developerName,
    contactDetails,
    isFeaturedDealer,
    companyLogo,
    developerWebsite,
    aboutDeveloper,
    trackRecord,
    pastProjects,
    setDeveloperName,
    setContactDetails,
    setIsFeaturedDealer,
    setCompanyLogo,
    setDeveloperWebsite,
    setAboutDeveloper,
    setTrackRecord,
    setPastProjects,
  } = useDevelopmentWizard();

  const [newProject, setNewProject] = useState({ name: '', year: '', location: '' });

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

  const addPastProject = () => {
    if (newProject.name && newProject.year && newProject.location) {
      setPastProjects([...pastProjects, newProject]);
      setNewProject({ name: '', year: '', location: '' });
    }
  };

  const removePastProject = (index: number) => {
    setPastProjects(pastProjects.filter((_, i) => i !== index));
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
              onChange={e => setDeveloperName(e.target.value)}
            />
          </div>

          {/* Featured Dealer */}
          <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg transition-colors hover:bg-orange-100/50">
            <Checkbox
              id="featuredDealer"
              checked={isFeaturedDealer}
              onCheckedChange={checked => setIsFeaturedDealer(checked as boolean)}
              className="mt-1 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <Label htmlFor="featuredDealer" className="text-sm font-medium cursor-pointer flex-1">
              <div className="flex items-center gap-2 text-orange-700 font-bold mb-1">
                <Award className="w-4 h-4" />
                Featured Dealer
              </div>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Display a "Featured Dealer" badge on your development card to increase visibility
                and trust.
              </p>
            </Label>
          </div>

          {/* Company Logo */}
          <div className="space-y-2">
            <Label className="text-slate-700">Company Logo (Optional)</Label>
            <div className="flex items-center gap-4">
              {companyLogo && (
                <div className="relative w-24 h-24 border-2 border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={companyLogo}
                    alt="Company logo"
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
                      {companyLogo ? 'Change Logo' : 'Upload Company Logo'}
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

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-slate-700">
              Company Website (Optional)
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="website"
                type="url"
                placeholder="https://www.yourcompany.com"
                value={developerWebsite || ''}
                onChange={e => setDeveloperWebsite(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Company Profile */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-slate-800">Company Profile</h3>
        </div>

        <div className="space-y-4">
          {/* About Developer */}
          <div className="space-y-2">
            <Label htmlFor="aboutDeveloper" className="text-slate-700">
              About Your Company (Optional)
            </Label>
            <Textarea
              id="aboutDeveloper"
              placeholder="Brief description of your company, values, and expertise in property development..."
              value={aboutDeveloper || ''}
              onChange={e => setAboutDeveloper(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">{aboutDeveloper?.length || 0}/500 characters</p>
          </div>

          {/* Track Record */}
          <div className="space-y-2">
            <Label htmlFor="trackRecord" className="text-slate-700 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              Track Record & Achievements (Optional)
            </Label>
            <Textarea
              id="trackRecord"
              placeholder="e.g., 20+ years in property development, 50+ successful projects completed, Award-winning developer..."
              value={trackRecord || ''}
              onChange={e => setTrackRecord(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Highlight your experience and achievements to build buyer confidence
            </p>
          </div>
        </div>
      </Card>

      {/* Past Projects */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-800">Past Projects</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Showcase previous successful developments to build credibility
        </p>

        {/* Existing Past Projects */}
        {pastProjects.length > 0 && (
          <div className="space-y-3 mb-4">
            {pastProjects.map((project, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{project.name}</p>
                  <p className="text-sm text-slate-600">
                    {project.location} • {project.year}
                  </p>
                </div>
                <button
                  onClick={() => removePastProject(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 rounded-full p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Project */}
        <div className="space-y-3 p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50">
          <Label className="text-slate-700 font-medium">Add Past Project (Optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Project name"
              value={newProject.name}
              onChange={e => setNewProject({ ...newProject, name: e.target.value })}
            />
            <Input
              placeholder="Year (e.g., 2022)"
              value={newProject.year}
              onChange={e => setNewProject({ ...newProject, year: e.target.value })}
            />
            <Input
              placeholder="Location"
              value={newProject.location}
              onChange={e => setNewProject({ ...newProject, location: e.target.value })}
            />
          </div>
          <Button
            onClick={addPastProject}
            disabled={!newProject.name || !newProject.year || !newProject.location}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
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
                onChange={e => updateContact('name', e.target.value)}
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
                  onChange={e => updateContact('email', e.target.value)}
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
                  onChange={e => updateContact('phone', e.target.value)}
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
              onValueChange={value => updateContact('preferredContact', value)}
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

      <div className="flex items-start gap-2 text-sm text-slate-500 px-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <div>
          <p className="font-medium text-blue-900 mb-1">Developer Profile Tips:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>
              • <strong>Company Logo:</strong> Professional logo increases trust by 35%
            </li>
            <li>
              • <strong>Track Record:</strong> Highlight years of experience and completed projects
            </li>
            <li>
              • <strong>Past Projects:</strong> Showcase 3-5 successful developments
            </li>
            <li>
              • <strong>Website:</strong> Link to your company website for more information
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
