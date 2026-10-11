import React from 'react';

interface DatabricksLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
}

export const DatabricksLogo: React.FC<DatabricksLogoProps> = ({
  className = '',
  size = 24,
  showWordmark = true,
  theme = 'dark'
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official Databricks Icon SVG */}
      <svg
        role="img"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="flex-shrink-0 text-[#FF3621] transition-transform duration-300 hover:scale-105"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Databricks Official Logo"
      >
        <title>Databricks</title>
        <path d="M.95 14.184L12 20.403l9.919-5.55v2.21L12 22.662l-10.484-5.96-.565.308v.77L12 24l11.05-6.218v-4.317l-.515-.309L12 19.118l-9.867-5.653v-2.21L12 16.805l11.05-6.218V6.32l-.515-.308L12 11.974 2.647 6.681 12 1.388l7.76 4.368.668-.411v-.566L12 0 .95 6.27v.72L12 13.207l9.919-5.55v2.26L12 15.52 1.516 9.56l-.565.308Z" />
      </svg>

      {showWordmark && (
        <span
          className={`font-semibold tracking-tight text-sm font-sans flex items-center ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}
        >
          databricks
        </span>
      )}
    </div>
  );
};
