// components/AdComponent.tsx - Enhanced with content validation

import { useEffect, useState } from 'react';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

interface AdComponentProps {
    adSlot: string;
    adFormat?: string;
    responsive?: boolean;
    minContentHeight?: number;
    requiresContent?: boolean;
}

const AdComponent: React.FC<AdComponentProps> = ({
    adSlot,
    adFormat = 'auto',
    responsive = true,
    minContentHeight = 1200,
    requiresContent = true
}) => {
    const [shouldRenderAd, setShouldRenderAd] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any>({});

    useEffect(() => {
        const validateContent = () => {
            if (!requiresContent) {
                setShouldRenderAd(true);
                return;
            }

            // Check document content
            const bodyHeight = document.body.scrollHeight;
            const textContent = document.body.innerText || '';
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

            // Check for substantial content elements
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const paragraphs = document.querySelectorAll('p');
            const contentSections = document.querySelectorAll('article, section, main, [class*="content"]');

            // Content quality metrics
            const hasSubstantialText = wordCount >= 500; // Increased threshold
            const hasProperStructure = headings.length >= 3 && paragraphs.length >= 5;
            const hasEnoughHeight = bodyHeight >= minContentHeight;
            const hasContentSections = contentSections.length >= 2;

            // Check for analysis-specific content
            const hasAnalysisContent = document.querySelectorAll('[class*="analysis"], [class*="result"], [class*="score"], [class*="recommendation"]').length >= 2;

            const contentValid = hasSubstantialText && hasProperStructure &&
                hasEnoughHeight && hasContentSections && hasAnalysisContent;

            const debug = {
                bodyHeight,
                wordCount,
                headings: headings.length,
                paragraphs: paragraphs.length,
                contentSections: contentSections.length,
                analysisElements: document.querySelectorAll('[class*="analysis"], [class*="result"]').length,
                hasSubstantialText,
                hasProperStructure,
                hasEnoughHeight,
                hasContentSections,
                hasAnalysisContent,
                contentValid,
                timestamp: new Date().toISOString()
            };

            setDebugInfo(debug);
            setShouldRenderAd(contentValid);

            if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Enhanced Ad Content Validation:', debug);
            }
        };

        // Validate after content loads
        const timeoutId = setTimeout(validateContent, 1500);

        return () => clearTimeout(timeoutId);
    }, [minContentHeight, requiresContent]);

    useEffect(() => {
        if (shouldRenderAd) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error("AdSense error:", err);
            }
        }
    }, [shouldRenderAd]);

    // Don't render if content validation fails
    if (!shouldRenderAd) {
        return process.env.NODE_ENV === 'development' ? (
            <div className="my-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
                <strong>🚫 Ad Blocked (Dev Only):</strong>
                <ul className="mt-2 text-xs space-y-1">
                    <li>Words: {debugInfo.wordCount} (need 500+)</li>
                    <li>Height: {debugInfo.bodyHeight}px (need {minContentHeight}+)</li>
                    <li>Headings: {debugInfo.headings} (need 3+)</li>
                    <li>Paragraphs: {debugInfo.paragraphs} (need 5+)</li>
                    <li>Content Sections: {debugInfo.contentSections} (need 2+)</li>
                    <li>Analysis Elements: {debugInfo.analysisElements} (need 2+)</li>
                </ul>
            </div>
        ) : null;
    }

    return (
        <div className="my-6 text-center">
            <div className="mb-2 text-xs text-gray-400 uppercase tracking-wider">
                Advertisement
            </div>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-5740140678935322"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={responsive.toString()}
            ></ins>

            {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 text-xs text-gray-500">
                    ✅ Ad rendered: {debugInfo.wordCount} words, {debugInfo.bodyHeight}px height
                </div>
            )}
        </div>
    );
};

export default AdComponent;