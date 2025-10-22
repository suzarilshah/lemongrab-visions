import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface PriceEstimatorProps {
  width: string;
  height: string;
  duration: string;
  variants: string;
  soraVersion?: string;
}

export default function PriceEstimator({ width, height, duration, variants, soraVersion = "sora-1" }: PriceEstimatorProps) {
  const calculatePrice = () => {
    const w = parseInt(width) || 1280;
    const h = parseInt(height) || 720;
    const d = parseInt(duration) || 12;
    const v = parseInt(variants) || 1;
    
    if (soraVersion === "sora-2") {
      // Sora 2 pricing: $0.10 per second (flat rate for 720x1280 and 1280x720)
      const totalCost = 0.10 * d * v;
      return totalCost.toFixed(2);
    } else {
      // Sora 1 pricing: ~$0.05 per second per variant at 720p, scales with resolution
      const basePrice = 0.05;
      const basePixels = 1280 * 720;
      const currentPixels = w * h;
      const resolutionMultiplier = currentPixels / basePixels;
      const totalCost = basePrice * d * v * resolutionMultiplier;
      return totalCost.toFixed(2);
    }
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
          Based on Azure OpenAI {soraVersion === "sora-2" ? "Sora 2" : "Sora 1"} pricing
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
