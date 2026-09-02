import { Star } from "lucide-react";
import { ComingSoon } from "../components/ComingSoon";

export function ReviewsPage() {
  return (
    <ComingSoon
      icon={Star}
      title="Reviews are coming soon"
      description="Rate My Professor and Rate My Course, with trending and most-reviewed rails."
    />
  );
}
