import { Bookmark, EllipsisVertical, Heart, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface ActionStackProps {
  contentId: string;
  liked: boolean;
  saved: boolean;
  onLike: (contentId: string) => void;
  onSave: (contentId: string) => void;
  onShare: (contentId: string) => void;
  onNotInterested: (contentId: string) => void;
}

function IconButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
        active ? 'border-white/60 bg-white/30 text-white' : 'border-white/20 bg-black/45 text-white/90'
      }`}
    >
      {children}
    </button>
  );
}

export function ActionStack({
  contentId,
  liked,
  saved,
  onLike,
  onSave,
  onShare,
  onNotInterested,
}: ActionStackProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-3">
      <IconButton label="Like" active={liked} onClick={() => onLike(contentId)}>
        <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
      </IconButton>
      <IconButton label="Save" active={saved} onClick={() => onSave(contentId)}>
        <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
      </IconButton>
      <IconButton label="Share" onClick={() => onShare(contentId)}>
        <Share2 className="h-5 w-5" />
      </IconButton>
      <IconButton
        label="More actions"
        onClick={() => {
          setMenuOpen(previous => !previous);
        }}
      >
        <EllipsisVertical className="h-5 w-5" />
      </IconButton>

      {menuOpen && (
        <div className="absolute bottom-0 right-14 rounded-lg border border-white/20 bg-slate-900/95 p-2 shadow-xl">
          <button
            onClick={() => {
              setMenuOpen(false);
              onNotInterested(contentId);
            }}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            Not interested
          </button>
        </div>
      )}
    </div>
  );
}
