import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = {
  variants: {
    default: "bg-blue-500 text-white hover:bg-blue-600",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-100",
    secondary: "bg-gray-500 text-white hover:bg-gray-600",
    ghost: "hover:bg-gray-100 text-gray-800",
    link: "text-blue-600 underline hover:text-blue-800"
  },
  sizes: {
    default: "h-10 px-4 py-2 text-base",
    sm: "h-9 px-3 py-1 text-sm",
    lg: "h-11 px-8 py-3 text-lg",
    icon: "h-10 w-10 p-0"
  }
}

const Button = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  ...props 
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants.variants[variant],
        buttonVariants.sizes[size],
        className
      )}
      {...props}
    />
  )
})

Button.displayName = "Button"

export { Button }