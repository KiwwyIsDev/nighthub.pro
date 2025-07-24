import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        {/* Crescent Moon */}
        <path
          d="M50 10C33.8 10 20 23.8 20 40C20 56.2 33.8 70 50 70C66.2 70 80 56.2 80 40C80 23.8 66.2 10 50 10ZM50 90C22.4 90 0 67.6 0 40C0 12.4 22.4 -10 50 -10C77.6 -10 100 12.4 100 40C100 67.6 77.6 90 50 90Z"
          fill="#CCCCCC"
        />
        {/* X */}
        <path d="M70 20L30 60M30 20L70 60" stroke="#CCCCCC" strokeWidth="10" strokeLinecap="round" />
      </svg>
    </div>
  )
}
