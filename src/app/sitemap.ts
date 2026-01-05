import { MetadataRoute } from 'next'

// 定义基础 URL
const BASE_URL = 'https://xera-2011.github.io/x-texas-holdem'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {

    // 定义所有公开页面
    const routes = [
        // 主页
        { url: '', priority: 1.0, changeFrequency: 'daily' as const },
    ]

    return routes.map((route) => ({
        url: `${BASE_URL}${route.url}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }))
}
