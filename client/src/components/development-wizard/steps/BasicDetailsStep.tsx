import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Building2, MapPin, Info, Star } from 'lucide-react';

export function BasicDetailsStep() {
  const {
    developmentName,
    address,
    city,
    province,
    suburb,
    postalCode,
    status,
    rating,
    setDevelopmentName,
    setAddress,
    setCity,
    setProvince,
    setSuburb,
    setPostalCode,
    setStatus,
    setRating,
  } = useDevelopmentWizard();

  return (
    <div className="space-y-6">
      {/* Development Name & Status */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Development Information</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="developmentName" className="text-slate-700">
              Development Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="developmentName"
              placeholder="e.g., Eye of Africa, Waterfall Estate"
              value={developmentName}
              onChange={(e) => setDevelopmentName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-slate-700">
              Development Status <span className="text-red-500">*</span>
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-launch">Pre-Launch</SelectItem>
                <SelectItem value="launching-soon">Launching Soon</SelectItem>
                <SelectItem value="now-selling">Now Selling</SelectItem>
                <SelectItem value="sold-out">Sold Out</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Current availability status of your development
            </p>
          </div>

          <div>
            <Label htmlFor="rating" className="text-slate-700">Rating (Optional)</Label>
            <div className="relative mt-1">
              <Star className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="e.g., 4.3"
                value={rating || ''}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Average rating out of 5.0 (if applicable)
            </p>
          </div>
        </div>
      </Card>

      {/* Location Details */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">Location Details</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="address" className="text-slate-700">
              Street Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              placeholder="Enter street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suburb" className="text-slate-700">Suburb</Label>
              <Input
                id="suburb"
                placeholder="e.g., Sandton"
                value={suburb || ''}
                onChange={(e) => setSuburb(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-slate-700">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="e.g., Johannesburg"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="province" className="text-slate-700">
                Province <span className="text-red-500">*</span>
              </Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger id="province" className="mt-1">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gauteng">Gauteng</SelectItem>
                  <SelectItem value="Western Cape">Western Cape</SelectItem>
                  <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                  <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                  <SelectItem value="Free State">Free State</SelectItem>
                  <SelectItem value="Limpopo">Limpopo</SelectItem>
                  <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                  <SelectItem value="North West">North West</SelectItem>
                  <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="postalCode" className="text-slate-700">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="e.g., 2196"
                value={postalCode || ''}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Info className="w-4 h-4" />
        <p><span className="text-red-500">*</span> Required fields</p>
      </div>
    </div>
  );
}
