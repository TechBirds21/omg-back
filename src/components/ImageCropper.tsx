// @ts-nocheck
import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crop as CropIcon, RotateCcw, Check, X } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  aspectRatio?: number;
  cropShape?: 'rect' | 'round';
  title?: string;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onCropComplete,
  aspectRatio,
  cropShape = 'rect',
  title = 'Crop Image'
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(aspectRatio);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspect,
          width,
          height,
        ),
        width,
        height,
      ));
    }
  }, [aspect]);

  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
    );

    ctx.restore();

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create blob');
        }
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg', 0.9);
    });
  }, [completedCrop, scale, rotate]);

  const handleCropComplete = async () => {
    try {
      const croppedImageUrl = await getCroppedImg();
      if (croppedImageUrl) {
        onCropComplete(croppedImageUrl);
        onClose();
        // Reset crop state
        setCrop(undefined);
        setCompletedCrop(undefined);
      }
    } catch (error) {
      
    }
  };

  const presetAspects = [
    { label: 'Free Form', value: undefined },
    { label: 'Square (1:1)', value: 1 },
    { label: 'Product Card (3:4)', value: 3/4 },
    { label: 'Hero Image (16:9)', value: 16/9 },
    { label: 'Category Banner (2:1)', value: 2/1 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CropIcon className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select 
                value={aspect?.toString() || 'free'} 
                onValueChange={(value) => setAspect(value === 'free' ? undefined : parseFloat(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetAspects.map((preset) => (
                    <SelectItem key={preset.label} value={preset.value?.toString() || 'free'}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scale: {scale.toFixed(2)}</Label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label>Rotate: {rotate}°</Label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={rotate}
                onChange={(e) => setRotate(Number(e.target.value))}
                className="w-32"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScale(1);
                setRotate(0);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Crop Area */}
          {imageUrl && (
            <div className="flex justify-center">
              <div className="max-w-full max-h-96 overflow-auto border rounded-lg">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  circularCrop={cropShape === 'round'}
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imageUrl}
                    crossOrigin="anonymous"
                    style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-96"
                  />
                </ReactCrop>
              </div>
            </div>
          )}

          {/* Preview and update canvas */}
          {React.useMemo(() => {
            if (completedCrop && imgRef.current && previewCanvasRef.current) {
              const updateCanvas = () => {
                const image = imgRef.current!;
                const canvas = previewCanvasRef.current!;
                const crop = completedCrop;

                const scaleX = image.naturalWidth / image.width;
                const scaleY = image.naturalHeight / image.height;
                const ctx = canvas.getContext('2d');

                if (!ctx) return;

                const pixelRatio = window.devicePixelRatio;
                canvas.width = crop.width * pixelRatio * scaleX;
                canvas.height = crop.height * pixelRatio * scaleY;

                ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
                ctx.imageSmoothingQuality = 'high';

                const cropX = crop.x * scaleX;
                const cropY = crop.y * scaleY;

                const centerX = image.naturalWidth / 2;
                const centerY = image.naturalHeight / 2;

                ctx.save();
                ctx.translate(-cropX, -cropY);
                ctx.translate(centerX, centerY);
                ctx.rotate((rotate * Math.PI) / 180);
                ctx.scale(scale, scale);
                ctx.translate(-centerX, -centerY);
                ctx.drawImage(
                  image,
                  0,
                  0,
                  image.naturalWidth,
                  image.naturalHeight,
                  0,
                  0,
                  image.naturalWidth,
                  image.naturalHeight,
                );
                ctx.restore();
              };
              updateCanvas();
            }
            return null;
          }, [completedCrop, scale, rotate])}

          {/* Preview */}
          {completedCrop && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex justify-center">
                <canvas
                  ref={previewCanvasRef}
                  className="border rounded-lg max-w-xs max-h-48"
                  style={{
                    objectFit: 'contain',
                    width: Math.min(completedCrop.width, 300),
                    height: Math.min(completedCrop.height, 200),
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="bg-primary text-primary-foreground"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
