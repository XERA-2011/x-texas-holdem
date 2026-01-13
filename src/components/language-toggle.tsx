"use client"

import * as React from "react"
import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"

export function LanguageToggle() {
    const { i18n } = useTranslation()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(nextLang);
    }

    if (!mounted) {
        return (
            <button
                className="inline-flex items-center justify-center rounded-full w-8 h-8 border-0 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                aria-label="Toggle language"
            >
                <Languages className="h-5 w-5" />
            </button>
        )
    }

    return (
        <button
            onClick={toggleLanguage}
            className="inline-flex items-center justify-center rounded-full w-8 h-8 border-0 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            aria-label="Toggle language"
            title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
        >
            <Languages className="h-5 w-5" />
            <span className="sr-only">{i18n.language === 'zh' ? 'EN' : '中'}</span>
        </button>
    )
}
