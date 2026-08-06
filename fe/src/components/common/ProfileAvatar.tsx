import { getBackendAssetUrl } from '@/api/http'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ProfileAvatarProps {
  src?: string | null
  fallbackLabel: string
  className?: string
}

// 프로필 사진이 있으면 인증 이미지로, 없으면 이니셜 원으로 보여주는 공통 아바타.
export function ProfileAvatar({ src, fallbackLabel, className }: ProfileAvatarProps) {
  return (
    <Avatar className={className}>
      {src ? (
        <AuthenticatedImage
          src={getBackendAssetUrl(src)}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <AvatarFallback className="border-0 bg-profile-avatar">
          {fallbackLabel}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
