import { DollarSign, Zap } from "lucide-react";

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
    <div className="card-premium rounded-xl p-6 h-fit">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Est. Cost
        </h3>
      </div>
      
      {/* Price Display */}
      <div className="mb-4">
        <p className="text-4xl font-bold text-gradient">${price}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {soraVersion === "sora-2" ? "Sora 2" : "Sora 1"} pricing
        </p>
      </div>
      
      {/* Breakdown */}
      <div className="space-y-2 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Resolution</span>
          <span className="font-mono font-medium">{width}×{height}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-mono font-medium">{duration}s</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Variants</span>
          <span className="font-mono font-medium">{variants}</span>
        </div>
      </div>
      
      {/* Rate Info */}
      <div className="mt-4 p-3 rounded-lg bg-card/50 text-xs text-muted-foreground">
        <p>
          {soraVersion === "sora-2" 
            ? "$0.10/second flat rate" 
            : "$0.05/second @ 720p, scales with resolution"}
        </p>
      </div>
    </div>
  );
}
