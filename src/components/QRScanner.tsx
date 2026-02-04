import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CameraOff, RefreshCw } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const QRScanner = ({ onScanSuccess, onScanError }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Validate URL format
          const validDomain = "rbli-results.lovable.app";
          if (decodedText.includes(validDomain)) {
            stopScanner();
            onScanSuccess(decodedText);
          } else {
            setError("Invalid QR code. Please scan a valid result QR code.");
          }
        },
        (errorMessage) => {
          // Silently ignore scan errors (no QR in frame)
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (err.toString().includes("Permission")) {
        setHasPermission(false);
        setError("Camera permission denied. Please allow camera access.");
      } else {
        setError("Failed to start camera. Please try again.");
      }
      onScanError?.(err.toString());
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    // Auto-start scanner on mount
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Scanner Container */}
          <div 
            ref={containerRef}
            className="relative aspect-square w-full max-w-[300px] mx-auto bg-muted rounded-lg overflow-hidden"
          >
            <div id="qr-reader" className="w-full h-full" />
            
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                {hasPermission === false ? (
                  <CameraOff className="h-12 w-12 text-muted-foreground mb-2" />
                ) : (
                  <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                )}
                <p className="text-sm text-muted-foreground text-center px-4">
                  {hasPermission === false 
                    ? "Camera access denied" 
                    : "Initializing camera..."}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="gap-2">
                <Camera className="h-4 w-4" />
                Start Scanner
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanner} className="gap-2">
                <CameraOff className="h-4 w-4" />
                Stop Scanner
              </Button>
            )}
            {error && (
              <Button variant="outline" onClick={startScanner} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>

          {/* Instructions */}
          <p className="text-xs text-center text-muted-foreground">
            Position the QR code within the frame to scan
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;
