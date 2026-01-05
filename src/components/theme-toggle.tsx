"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button
                className="inline-flex items-center justify-center rounded-full w-8 h-8 border-0 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                aria-label="Toggle theme"
                suppressHydrationWarning
            >
                <Sun className="h-5 w-5" />
            </button>
        )
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-full w-8 h-8 border-0 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            aria-label="Toggle theme"
            suppressHydrationWarning
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </button>
    )
}
