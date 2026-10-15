import { useState, type ImgHTMLAttributes } from 'react';
import { AREA_IMAGE_FALLBACK } from '@/lib/presenceImages';

type PresenceImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError'> & {
  fallbackSrc?: string;
  fallbackAlt?: string;
};

/** Missing and failed media share one bundled fallback without retry loops. */
export function PresenceImage({
  src,
  alt,
  fallbackSrc = AREA_IMAGE_FALLBACK,
  fallbackAlt = '',
  style,
  ...props
}: PresenceImageProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = [src, fallbackSrc].find(url => url && !failed.includes(url));
  return (
    <img
      {...props}
      src={source}
      alt={source === src ? alt : fallbackAlt}
      style={source ? style : { ...style, visibility: 'hidden' }}
      onError={() => {
        if (source) setFailed(current => [...current, source]);
      }}
    />
  );
}
