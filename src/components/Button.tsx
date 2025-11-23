import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline'
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', ...props }) => {
    const baseStyles = "px-6 py-2 font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
        primary: "bg-primary text-black hover:bg-yellow-500",
        secondary: "bg-secondary text-white hover:bg-red-900",
        outline: "border-2 border-primary text-primary hover:bg-primary/10"
    }

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        />
    )
}

export default Button
