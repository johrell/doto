import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M8 3v10M3 8h10" /></Icon>;
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></Icon>;
export const ChevronDownIcon = (p: IconProps) => <Icon size={14} {...p}><path d="M4 6l4 4 4-4" /></Icon>;
export const ClockIcon = (p: IconProps) => <Icon size={12} {...p}><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 1.5" /></Icon>;
export const PlayIcon = (p: IconProps) => <Icon size={12} {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8" /></Icon>;
export const CheckIcon = (p: IconProps) => <Icon size={12} {...p}><path d="M3 8.5l3 3 7-7" /></Icon>;
export const AlertIcon = (p: IconProps) => <Icon size={12} {...p}><path d="M8 2.5l6 11H2z" /><path d="M8 7v3M8 12h.01" /></Icon>;
export const DownloadIcon = (p: IconProps) => <Icon {...p}><path d="M8 2.5v8M4.5 7L8 10.5 11.5 7" /><path d="M2.5 12.5h11" /></Icon>;
export const UploadIcon = (p: IconProps) => <Icon {...p}><path d="M8 10.5v-8M4.5 6L8 2.5 11.5 6" /><path d="M2.5 12.5h11" /></Icon>;
export const MoonIcon = (p: IconProps) => <Icon {...p}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" /></Icon>;
export const XIcon = (p: IconProps) => <Icon {...p}><path d="M4 4l8 8M12 4l-8 8" /></Icon>;
export const LinkIcon = (p: IconProps) => <Icon {...p}><path d="M6.5 9.5l3-3" /><path d="M7 11l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L3.5 7.5" /><path d="M9 5l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L12.5 8.5" /></Icon>;
export const TrashIcon = (p: IconProps) => <Icon {...p}><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" /></Icon>;
export const FolderIcon = (p: IconProps) => <Icon {...p}><path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" /></Icon>;
export const PencilIcon = (p: IconProps) => <Icon {...p}><path d="M11.5 2.5l2 2L5 13H3v-2z" /><path d="M10 4l2 2" /></Icon>;
export const DragIcon = (p: IconProps) => (
  <Icon {...p} stroke="none" fill="currentColor">
    <circle cx="6" cy="4" r="1" /><circle cx="10" cy="4" r="1" />
    <circle cx="6" cy="8" r="1" /><circle cx="10" cy="8" r="1" />
    <circle cx="6" cy="12" r="1" /><circle cx="10" cy="12" r="1" />
  </Icon>
);
