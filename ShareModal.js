// Assuming initial part of ShareModal.js for context
import React, { useEffect, useState } from 'react';

const ShareModal = ({ roomId }) => {
    const [watchUrl, setWatchUrl] = useState('');

    useEffect(() => {
        const fetchWatchUrl = async () => {
            try {
                const response = await fetch(`/api/qr/watch/${roomId}`);
                if (response.ok) {
                    const data = await response.json();
                    setWatchUrl(data.watchUrl); // Set the watch URL from server response
                } else {
                    console.error('Failed to fetch watch URL');
                }
            } catch (error) {
                console.error('Error fetching watch URL:', error);
            }
        };
        fetchWatchUrl();
    }, [roomId]);

    return (
        <div>
            <h1>Share this link</h1>
            <input type="text" value={watchUrl} readOnly />
        </div>
    );
};

export default ShareModal;