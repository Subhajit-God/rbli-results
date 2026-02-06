import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PdfAssetType = "headmaster_signature" | "school_stamp";

export interface PdfAsset {
  id: string;
  asset_type: PdfAssetType;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  updated_at: string;
}

export const usePdfAssets = () => {
  const [assets, setAssets] = useState<Record<PdfAssetType, PdfAsset | null>>({
    headmaster_signature: null,
    school_stamp: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<PdfAssetType | null>(null);
  const { toast } = useToast();

  const fetchAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pdf_assets")
        .select("*");

      if (error) throw error;

      const assetMap: Record<PdfAssetType, PdfAsset | null> = {
        headmaster_signature: null,
        school_stamp: null,
      };

      data?.forEach((asset) => {
        if (asset.asset_type === "headmaster_signature" || asset.asset_type === "school_stamp") {
          assetMap[asset.asset_type as PdfAssetType] = asset as PdfAsset;
        }
      });

      setAssets(assetMap);
    } catch (error) {
      console.error("Error fetching PDF assets:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const uploadAsset = async (assetType: PdfAssetType, file: File) => {
    setIsUploading(assetType);

    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file (PNG, JPG, etc.)");
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${assetType}_${Date.now()}.${fileExt}`;
      const filePath = `${assetType}/${fileName}`;

      // Delete old file if exists
      const existingAsset = assets[assetType];
      if (existingAsset) {
        const oldPath = existingAsset.file_url.split("/pdf-assets/")[1];
        if (oldPath) {
          await supabase.storage.from("pdf-assets").remove([oldPath]);
        }
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from("pdf-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("pdf-assets")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Upsert asset record
      const { error: dbError } = await supabase
        .from("pdf_assets")
        .upsert({
          asset_type: assetType,
          file_url: publicUrl,
          file_name: file.name,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "asset_type",
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload Successful",
        description: `${assetType === "headmaster_signature" ? "Headmaster's signature" : "School stamp"} has been uploaded.`,
      });

      await fetchAssets();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload the image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(null);
    }
  };

  const deleteAsset = async (assetType: PdfAssetType) => {
    try {
      const existingAsset = assets[assetType];
      if (!existingAsset) return;

      // Delete from storage
      const filePath = existingAsset.file_url.split("/pdf-assets/")[1];
      if (filePath) {
        await supabase.storage.from("pdf-assets").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("pdf_assets")
        .delete()
        .eq("asset_type", assetType);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: `${assetType === "headmaster_signature" ? "Headmaster's signature" : "School stamp"} has been removed.`,
      });

      await fetchAssets();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete the image",
        variant: "destructive",
      });
    }
  };

  return {
    assets,
    isLoading,
    isUploading,
    uploadAsset,
    deleteAsset,
    refetch: fetchAssets,
  };
};
