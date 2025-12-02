import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Copy,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageSquare,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: number;
  agentName: string;
}

export function ShareProfileModal({ isOpen, onClose, agentId, agentName }: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);
  
  const profileUrl = `${window.location.origin}/agent/profile/${agentId}`;
  const shareText = `Check out ${agentName}'s real estate profile!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success('Profile link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(profileUrl);
    const encodedText = encodeURIComponent(shareText);
    
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      email: `mailto:?subject=${encodedText}&body=Check%20out%20this%20agent%20profile:%20${encodedUrl}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleViewProfile = () => {
    window.open(profileUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Share Your Profile</DialogTitle>
          <DialogDescription>
            Share your professional profile to attract more clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Link */}
          <div className="space-y-2">
            <Label htmlFor="profile-link" className="text-sm font-semibold">
              Your Profile Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="profile-link"
                value={profileUrl}
                readOnly
                className="bg-gray-50"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* View Profile Button */}
          <Button
            onClick={handleViewProfile}
            variant="outline"
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview Your Public Profile
          </Button>

          {/* Social Share Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Share on Social Media</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleShare('facebook')}
                variant="outline"
                className="justify-start"
              >
                <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                Facebook
              </Button>
              <Button
                onClick={() => handleShare('twitter')}
                variant="outline"
                className="justify-start"
              >
                <Twitter className="h-4 w-4 mr-2 text-sky-500" />
                Twitter
              </Button>
              <Button
                onClick={() => handleShare('linkedin')}
                variant="outline"
                className="justify-start"
              >
                <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                LinkedIn
              </Button>
              <Button
                onClick={() => handleShare('whatsapp')}
                variant="outline"
                className="justify-start"
              >
                <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                WhatsApp
              </Button>
              <Button
                onClick={() => handleShare('email')}
                variant="outline"
                className="justify-start col-span-2"
              >
                <Mail className="h-4 w-4 mr-2 text-gray-600" />
                Email
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Marketing Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Add your profile link to your email signature</li>
              <li>• Share on your social media bio</li>
              <li>• Include in your business cards (QR code)</li>
              <li>• Use in property listing descriptions</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
