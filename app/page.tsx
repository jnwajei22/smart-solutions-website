import { inquiryOnly } from "../lib/launch";
import { MarketingHome } from "../components/marketing-home";

export default function Home() {
  return <MarketingHome inquiryOnly={inquiryOnly()} />;
}
