import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { User } from 'lucide-react';

interface SecureAvatarProps {
  src: string | null | undefined;
  alt?: string;
  fallback?: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Avatar component that automatically resolves private storage URLs
 * to signed URLs for the avatars bucket.
 */
export const SecureAvatar: React.FC<SecureAvatarProps> = ({
  src,
  alt,
  fallback,
  className = 'w-10 h-10',
  fallbackClassName,
}) => {
  const signedUrl = useAvatarUrl(src);

  return (
    <Avatar className={className}>
      {signedUrl && <AvatarImage src={signedUrl} alt={alt || ''} />}
      <AvatarFallback className={fallbackClassName}>
        {fallback || <User className="w-4 h-4" />}
      </AvatarFallback>
    </Avatar>
  );
};

/**
 * Secure img element for avatar URLs from private storage.
 * Use this when you need a plain <img> instead of the Avatar component.
 */
export const SecureAvatarImg: React.FC<{
  src: string | null | undefined;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}> = ({ src, alt = '', className = '', loading = 'lazy' }) => {
  const signedUrl = useAvatarUrl(src);

  if (!signedUrl) return null;

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
};
