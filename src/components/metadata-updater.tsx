'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function MetadataUpdater() {
    const { t, i18n } = useTranslation();

    useEffect(() => {
        // Update document title
        document.title = t('metadata.title');

        // Update html lang attribute
        document.documentElement.lang = i18n.language;
    }, [t, i18n.language]);

    return null;
}
