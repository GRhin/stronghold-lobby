import { useRef, useEffect, useState, useLayoutEffect } from 'react'

/**
 * A hook that manages auto-scrolling for a chat container.
 * It detects if the user is near the bottom of the container.
 * If they are, it automatically scrolls to the bottom when new content (dependency) is added.
 * If they are scrolled up, it maintains their position.
 * 
 * @param dependency The data source that triggers a potential scroll (e.g. messages array)
 * @param threshold Threshold in pixels to consider "near bottom" (default 100px)
 */
export function useSmartScroll<T>(dependency: T, threshold = 100) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isNearBottom, setIsNearBottom] = useState(true)

    // Handle scroll events to update isNearBottom state
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            // Check if we are within 'threshold' pixels of the bottom
            const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
            setIsNearBottom(distanceToBottom <= threshold)
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [threshold])

    // Scroll to bottom when dependency changes, ONLY if we were near bottom
    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return

        if (isNearBottom) {
            container.scrollTop = container.scrollHeight
        }
    }, [dependency, isNearBottom])

    return containerRef
}
