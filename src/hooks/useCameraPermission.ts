import { useState, useCallback, useEffect } from 'react';

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unknown';

interface CameraPermissionState {
  camera: PermissionStatus;
  microphone: PermissionStatus;
}

export const useCameraPermission = () => {
  const [permissions, setPermissions] = useState<CameraPermissionState>({
    camera: 'unknown',
    microphone: 'unknown',
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check current permission state
  const checkPermissions = useCallback(async () => {
    setIsChecking(true);
    
    try {
      // Check camera permission
      if (navigator.permissions) {
        try {
          const cameraResult = await navigator.permissions.query({ 
            name: 'camera' as PermissionName 
          });
          setPermissions(prev => ({ ...prev, camera: cameraResult.state }));
          
          cameraResult.onchange = () => {
            setPermissions(prev => ({ ...prev, camera: cameraResult.state }));
          };
        } catch {
          // Camera permission query not supported, will check on request
          setPermissions(prev => ({ ...prev, camera: 'unknown' }));
        }

        try {
          const micResult = await navigator.permissions.query({ 
            name: 'microphone' as PermissionName 
          });
          setPermissions(prev => ({ ...prev, microphone: micResult.state }));
          
          micResult.onchange = () => {
            setPermissions(prev => ({ ...prev, microphone: micResult.state }));
          };
        } catch {
          setPermissions(prev => ({ ...prev, microphone: 'unknown' }));
        }
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Request camera access
  const requestCameraAccess = useCallback(async (includeAudio: boolean = false): Promise<MediaStream | null> => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: includeAudio,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setPermissions(prev => ({
        ...prev,
        camera: 'granted',
        microphone: includeAudio ? 'granted' : prev.microphone,
      }));
      
      return stream;
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissions(prev => ({
          ...prev,
          camera: 'denied',
          microphone: includeAudio ? 'denied' : prev.microphone,
        }));
      }
      throw err;
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    isChecking,
    checkPermissions,
    requestCameraAccess,
    isCameraGranted: permissions.camera === 'granted',
    isCameraDenied: permissions.camera === 'denied',
    needsPermission: permissions.camera === 'prompt' || permissions.camera === 'unknown',
  };
};

export default useCameraPermission;
