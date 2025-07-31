// components/AdComponent.tsx

import { useEffect } from 'react';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

interface AdComponentProps {
    adSlot: string;
    adFormat?: string;
    responsive?: boolean;
}

const AdComponent: React.FC<AdComponentProps> = ({
    adSlot,
    adFormat = 'auto',
    responsive = true
}) => {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error("AdSense error:", err);
        }
    }, []);

    return (
        <div className="my-4 text-center">
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-5740140678935322"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={responsive.toString()}
            ></ins>
        </div>
    );
};

export default AdComponent;