import { useRef } from "react";
import { Loader2, Upload, Trash2, FileSignature, Stamp, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePdfAssets, PdfAssetType } from "@/hooks/usePdfAssets";

interface AssetUploadCardProps {
  assetType: PdfAssetType;
  title: string;
  description: string;
  icon: React.ReactNode;
  currentAsset: { file_url: string; file_name: string; updated_at: string } | null;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

const AssetUploadCard = ({
  assetType,
  title,
  description,
  icon,
  currentAsset,
  isUploading,
  onUpload,
  onDelete,
}: AssetUploadCardProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {currentAsset ? (
        <div className="space-y-3">
          <div className="relative aspect-[3/1] w-full max-w-[200px] border rounded-lg overflow-hidden bg-muted/30">
            <img
              src={currentAsset.file_url}
              alt={title}
              className="w-full h-full object-contain p-2"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{currentAsset.file_name}</span>
            <span>•</span>
            <span>Updated {new Date(currentAsset.updated_at).toLocaleDateString()}</span>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id={`upload-${assetType}`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Replace
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/20">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No image uploaded</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id={`upload-${assetType}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

const PdfAssetsSection = () => {
  const { assets, isLoading, isUploading, uploadAsset, deleteAsset } = usePdfAssets();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            PDF Signature & Stamp
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          PDF Signature & Stamp
        </CardTitle>
        <CardDescription>
          Upload the Headmaster's signature and school stamp/seal to be displayed on all generated Result PDFs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <AssetUploadCard
            assetType="headmaster_signature"
            title="Headmaster's Signature"
            description="Upload a transparent PNG image of the signature for best results."
            icon={<FileSignature className="h-5 w-5" />}
            currentAsset={assets.headmaster_signature}
            isUploading={isUploading === "headmaster_signature"}
            onUpload={(file) => uploadAsset("headmaster_signature", file)}
            onDelete={() => deleteAsset("headmaster_signature")}
          />

          <AssetUploadCard
            assetType="school_stamp"
            title="School Stamp / Seal"
            description="Upload a transparent PNG image of the official school stamp."
            icon={<Stamp className="h-5 w-5" />}
            currentAsset={assets.school_stamp}
            isUploading={isUploading === "school_stamp"}
            onUpload={(file) => uploadAsset("school_stamp", file)}
            onDelete={() => deleteAsset("school_stamp")}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          <strong>Tip:</strong> For best results, use PNG images with transparent backgrounds. Maximum file size: 5MB.
        </p>
      </CardContent>
    </Card>
  );
};

export default PdfAssetsSection;
