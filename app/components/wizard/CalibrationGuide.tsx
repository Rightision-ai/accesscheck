import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, Upload } from 'lucide-react';

interface CalibrationGuideProps {
    onPhotoCaptured: (photo: File) => void;
    calibrationStatus: 'PENDING' | 'CHECKING' | 'VALID' | 'INVALID';
    feedbackMessage?: string;
}

export const CalibrationGuide: React.FC<CalibrationGuideProps> = ({ onPhotoCaptured, calibrationStatus, feedbackMessage }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const [cameraAvailable, setCameraAvailable] = useState<boolean>(true);

    // Initialize Camera
    useEffect(() => {
        let isMounted = true;
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (isMounted) {
                    setStream(mediaStream);
                    setCameraAvailable(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } else {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                if (isMounted) {
                    setCameraAvailable(false);
                }
            }
        };

        if ((calibrationStatus === 'PENDING' || calibrationStatus === 'INVALID') && cameraAvailable) {
            startCamera();
        }

        return () => {
            isMounted = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [calibrationStatus]); // Removed cameraAvailable from dependency to prevent loop if it changes

    const takePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "calibration_photo.jpg", { type: "image/jpeg" });
                    onPhotoCaptured(file);
                }
            }, 'image/jpeg');
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onPhotoCaptured(file);
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-xl">
            <h3 className="text-base font-bold mb-1 text-gray-800">Calibration Check</h3>
            <p className="text-[11px] text-gray-600 mb-3 text-center max-w-[280px]">
                Place an <strong>A4 Paper</strong> or <strong>Credit Card</strong> next to the object. Ensure it is flat.
            </p>
            
            {!cameraAvailable ? (
                <div className="relative w-full max-w-[320px] aspect-[4/3] bg-gray-200 rounded-xl overflow-hidden mb-3 flex flex-col items-center justify-center p-4 text-center">
                   <AlertTriangle className="text-amber-500 w-12 h-12 mb-2" />
                   <p className="text-sm font-semibold text-gray-700">Camera not available</p>
                   <p className="text-xs text-gray-500 mt-1">Please upload a photo instead.</p>
                </div>
            ) : (
                <div className="relative w-full max-w-[320px] aspect-[4/3] bg-black rounded-xl overflow-hidden mb-3">
                    {calibrationStatus === 'VALID' && !stream ? (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <CheckCircle className="text-green-500 w-16 h-16" />
                        </div>
                    ) : (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    )}

                    {/* Overlay Guide */}
                    <div className="absolute inset-0 border-2 border-dashed border-white opacity-40 pointer-events-none flex items-center justify-center">
                        <span className="text-white text-[10px] bg-black/50 px-2 py-0.5 rounded">Place Reference Here</span>
                    </div>

                    {/* Status Overlay */}
                    {calibrationStatus === 'CHECKING' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <RefreshCw className="animate-spin text-white w-8 h-8" />
                        </div>
                    )}
                    {calibrationStatus === 'VALID' && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center border-4 border-green-500">
                            <CheckCircle className="text-green-500 w-12 h-12 bg-white rounded-full" />
                        </div>
                    )}
                    {calibrationStatus === 'INVALID' && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center border-4 border-red-500">
                            <AlertTriangle className="text-red-500 w-12 h-12 bg-white rounded-full" />
                        </div>
                    )}
                </div>
            )}

            {feedbackMessage && (
                <div className={`text-[12px] font-bold mb-3 text-center ${calibrationStatus === 'INVALID' ? 'text-red-600' : 'text-gray-700'}`}>
                    {feedbackMessage}
                </div>
            )}

            <div className="flex gap-2 w-full justify-center">
                {cameraAvailable && (
                    <button
                        onClick={takePhoto}
                        disabled={calibrationStatus === 'CHECKING'}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                    >
                        <Camera size={16} />
                        {calibrationStatus === 'INVALID' ? 'Retake Photo' : 'Capture'}
                    </button>
                )}

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                />
                
                <button
                    onClick={triggerFileUpload}
                    disabled={calibrationStatus === 'CHECKING'}
                    className={`bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 text-sm ${!cameraAvailable ? 'w-full justify-center' : ''}`}
                >
                    <Upload size={16} />
                    {cameraAvailable ? 'Upload' : 'Upload Photo'}
                </button>
            </div>
        </div>
    );
};
