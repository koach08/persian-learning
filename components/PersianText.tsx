interface PersianTextProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
  "2xl": "text-4xl",
};

export default function PersianText({
  children,
  className = "",
  size = "md",
}: PersianTextProps) {
  return (
    <span
      dir="rtl"
      className={`persian-text ${sizeMap[size]} ${className}`}
    >
      {children}
    </span>
  );
}
