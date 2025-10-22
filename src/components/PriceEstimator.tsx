import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface PriceEstimatorProps {
  width: string;
  height: string;
  duration: string;
  variants: string;
}

export default function PriceEstimator({ width, height, duration, variants }: PriceEstimatorProps) {
  // Azure Sora pricing: ~$0.05 per second per variant at 720p, scales with resolution
  const calculatePrice = () => {
    const w = parseInt(width) || 1280;
    const h = parseInt(height) || 720;
    const d = parseInt(duration) || 12;
    const v = parseInt(variants) || 1;
    
    // Base price per second (720p baseline)
    const basePrice = 0.05;
    
    // Resolution multiplier (relative to 720p = 921,600 pixels)
    const basePixels = 1280 * 720;
    const currentPixels = w * h;
    const resolutionMultiplier = currentPixels / basePixels;
    
    // Calculate total cost
    const totalCost = basePrice * d * v * resolutionMultiplier;
    
    return totalCost.toFixed(2);
  };

  const price = calculatePrice();

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Estimated Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">${price}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on Azure OpenAI pricing
        </p>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Resolution:</span>
            <span className="font-medium">{width}×{height}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-medium">{duration}s</span>
          </div>
          <div className="flex justify-between">
            <span>Variants:</span>
            <span className="font-medium">{variants}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
