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
  Facebook,
  Twitter,
  Mail,
  Link2,
  MessageCircle,
  Printer,
  QrCode,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface PropertyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyUrl: string;
}

export function PropertyShareModal({
  isOpen,
  onClose,
  propertyTitle,
  propertyUrl,
}: PropertyShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(propertyUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(propertyUrl);
    const encodedTitle = encodeURIComponent(propertyTitle);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodedTitle}&body=Check out this property: ${encodedUrl}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Property</DialogTitle>
          <DialogDescription>
            Share this property with friends and family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Copy Link */}
          <div className="space-y-2">
            <Label>Property Link</Label>
            <div className="flex gap-2">
              <Input
                value={propertyUrl}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={handleCopyLink}
                variant={copied ? 'default' : 'outline'}
                className="min-w-[100px]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <Label>Share via Social Media</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                Facebook
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-4 w-4 mr-2 text-sky-500" />
                Twitter
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('whatsapp')}
              >
                <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>

          {/* Additional Actions */}
          <div className="space-y-2">
            <Label>Additional Actions</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled
                title="QR Code generation coming soon"
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
