import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export function SidebarContactForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Message sent successfully!');
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
          Name
        </Label>
        <Input id="name" placeholder="Your Name" required className="bg-white" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </Label>
        <Input id="email" type="email" placeholder="Your Email" required className="bg-white" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
          Phone
        </Label>
        <Input id="phone" type="tel" placeholder="Your Phone Number" className="bg-white" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">I am interested in...</Label>
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="schedule"
              className="data-[state=checked]:bg-[#005ca8] data-[state=checked]:border-[#005ca8]"
            />
            <label
              htmlFor="schedule"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
            >
              Scheduling a viewing
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="details"
              defaultChecked
              className="data-[state=checked]:bg-[#005ca8] data-[state=checked]:border-[#005ca8]"
            />
            <label
              htmlFor="details"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
            >
              Property details
            </label>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg shadow-md transition-all hover:shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Contact Agent'}
      </Button>

      <p className="text-xs text-slate-400 text-center mt-2">
        By clicking Contact Agent, you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
}
