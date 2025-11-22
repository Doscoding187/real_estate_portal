import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Development Basics</h2>
        <p className="text-slate-600">Enter the basic information about your development</p>
      </div>

      {/* Development Name */}
      <div className="space-y-2">
        <Label htmlFor="developmentName">
          Development Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="developmentName"
          placeholder="e.g., Eye of Africa, Waterfall Estate"
          value={developmentName}
          onChange={(e) => setDevelopmentName(e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Street Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="address"
          placeholder="Enter street address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* Location Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suburb">Suburb</Label>
          <Input
            id="suburb"
            placeholder="e.g., Sandton"
            value={suburb || ''}
            onChange={(e) => setSuburb(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="city"
            placeholder="e.g., Johannesburg"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">
            Province <span className="text-red-500">*</span>
          </Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger id="province">
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

        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            placeholder="e.g., 2196"
            value={postalCode || ''}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </div>
      </div>

      {/* Development Status */}
      <div className="space-y-2">
        <Label htmlFor="status">
          Development Status <span className="text-red-500">*</span>
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pre-launch">Pre-Launch</SelectItem>
            <SelectItem value="launching-soon">Launching Soon</SelectItem>
            <SelectItem value="now-selling">Now Selling</SelectItem>
            <SelectItem value="sold-out">Sold Out</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">
          Current availability status of your development
        </p>
      </div>

      {/* Rating (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="rating">Rating (Optional)</Label>
        <Input
          id="rating"
          type="number"
          min="0"
          max="5"
          step="0.1"
          placeholder="e.g., 4.3"
          value={rating || ''}
          onChange={(e) => setRating(parseFloat(e.target.value))}
        />
        <p className="text-sm text-slate-500">
          Average rating out of 5.0 (if applicable)
        </p>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>
    </div>
  );
}
